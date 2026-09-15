-- Runs only when the postgres volume is initialized for the first time.
-- Integration tests use this database so they never touch development data.
CREATE DATABASE politics_game_test;
