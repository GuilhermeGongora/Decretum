/**
 * Game engine schema for the Decretum MVP (GDD §26).
 * Card choices and conditions are JSONB validated by src/content/validate.js before seeding.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      version integer NOT NULL CHECK (version >= 1),
      role text NOT NULL CHECK (role IN ('president')),
      type text NOT NULL CHECK (type IN ('common', 'conditional', 'chained', 'crisis')),
      speaker jsonb NOT NULL,
      category text NOT NULL,
      text text NOT NULL,
      left_choice jsonb NOT NULL,
      right_choice jsonb NOT NULL,
      conditions jsonb NOT NULL,
      weight integer NOT NULL CHECK (weight >= 0),
      cooldown_turns integer NOT NULL CHECK (cooldown_turns >= 0),
      unique_per_game boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      tags text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE endings (
      code text PRIMARY KEY,
      kind text NOT NULL CHECK (kind IN ('collapse', 'completion')),
      title text NOT NULL,
      text text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      role text NOT NULL CHECK (role IN ('president')),
      status text NOT NULL CHECK (status IN ('active', 'ended', 'completed')),
      turn integer NOT NULL CHECK (turn BETWEEN 1 AND 48),
      start_year integer NOT NULL CHECK (start_year >= 1),
      people integer NOT NULL CHECK (people BETWEEN 0 AND 100),
      market integer NOT NULL CHECK (market BETWEEN 0 AND 100),
      congress integer NOT NULL CHECK (congress BETWEEN 0 AND 100),
      institutions integer NOT NULL CHECK (institutions BETWEEN 0 AND 100),
      current_card_id uuid REFERENCES cards (id),
      last_card_id uuid REFERENCES cards (id),
      previous_game_id uuid REFERENCES games (id),
      mandate_completed boolean NOT NULL DEFAULT false,
      ending_code text REFERENCES endings (code),
      simultaneous_ending_codes text[] NOT NULL DEFAULT '{}',
      rng_seed text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz,
      CONSTRAINT games_one_successor UNIQUE (previous_game_id),
      CONSTRAINT games_active_has_current_card CHECK ((status = 'active') = (current_card_id IS NOT NULL)),
      CONSTRAINT games_finished_has_ending CHECK ((status = 'active') = (ending_code IS NULL))
    );

    -- Immutable history: snapshots keep the text shown at decision time.
    CREATE TABLE decisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      turn integer NOT NULL CHECK (turn BETWEEN 1 AND 48),
      card_id uuid NOT NULL REFERENCES cards (id),
      card_slug text NOT NULL,
      card_version integer NOT NULL,
      speaker jsonb NOT NULL,
      card_text text NOT NULL,
      choice text NOT NULL CHECK (choice IN ('left', 'right')),
      choice_label text NOT NULL,
      result_text text NOT NULL,
      deltas jsonb NOT NULL,
      meters_before jsonb NOT NULL,
      meters_after jsonb NOT NULL,
      flag_changes jsonb NOT NULL,
      scheduled_events jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT decisions_one_per_turn UNIQUE (game_id, turn)
    );

    CREATE TABLE game_flags (
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      key text NOT NULL,
      value jsonb NOT NULL,
      label text NOT NULL,
      legacy boolean NOT NULL DEFAULT false,
      legacy_priority integer NOT NULL DEFAULT 0,
      successor_effects jsonb,
      set_at_turn integer NOT NULL,
      expires_at_turn integer,
      inherited boolean NOT NULL DEFAULT false,
      PRIMARY KEY (game_id, key)
    );

    CREATE TABLE scheduled_events (
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      sequence integer NOT NULL CHECK (sequence >= 1),
      card_id uuid NOT NULL REFERENCES cards (id),
      turn_due integer NOT NULL,
      priority integer NOT NULL DEFAULT 0,
      status text NOT NULL CHECK (status IN ('pending', 'fired', 'cancelled')),
      created_at_turn integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (game_id, sequence),
      CONSTRAINT scheduled_events_after_creation CHECK (turn_due > created_at_turn)
    );

    CREATE INDEX scheduled_events_pending_idx
      ON scheduled_events (game_id, turn_due)
      WHERE status = 'pending';

    CREATE TABLE card_appearances (
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      turn integer NOT NULL CHECK (turn BETWEEN 1 AND 48),
      card_id uuid NOT NULL REFERENCES cards (id),
      PRIMARY KEY (game_id, turn)
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE card_appearances;
    DROP TABLE scheduled_events;
    DROP TABLE game_flags;
    DROP TABLE decisions;
    DROP TABLE games;
    DROP TABLE endings;
    DROP TABLE cards;
  `);
};
