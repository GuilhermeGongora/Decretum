import { loadContent } from "@/src/content";
import { toCampaignView, toCandidateOptionsView, toCountryView } from "@/src/services/gameViews";

// Every country the selection screen may show. Playable packs also carry what the onboarding needs to
// build a candidate and run the campaign; the consequences of each option stay on the server.
export function listCountryDossiers() {
  const { countries } = loadContent();

  return {
    countries: Object.values(countries).map((country) =>
      country.playable
        ? {
            ...toCountryView(country),
            candidateOptions: toCandidateOptionsView(country),
            campaign: toCampaignView(country),
          }
        : toCountryView(country),
    ),
  };
}
