import { toConfig } from "roam-client";
import { createConfigObserver } from "roamjs-components";
import GrainLogo from "./assets/grain.svg";

const CONFIG = toConfig("grain");
createConfigObserver({
  title: CONFIG,
  config: {
    tabs: [
      {
        id: "home",
        fields: [
          {
            title: "oauth",
            type: "oauth",
            description: "Log in to your Grain account",
            options: {
              service: "grain",
              ServiceIcon: GrainLogo,
              getPopoutUrl: () =>
                Promise.resolve(`https://roamjs.com/oauth?mock=Grain`),
              getAuthData: (data) => Promise.resolve(JSON.parse(data)),
            },
          },
        ],
      },
    ],
  },
});
