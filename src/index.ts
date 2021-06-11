import {
  addOldRoamJSDependency,
  createPageTitleObserver,
  getLinkedPageTitlesUnderUid,
  toConfig,
  toRoamDate,
  toRoamDateUid,
} from "roam-client";
import { createConfigObserver } from "roamjs-components";
import GrainLogo from "./assets/grain.svg";
import { render } from "./GrainFeed";

addOldRoamJSDependency("video");

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

const today = new Date();
const title = toRoamDate(today);
const parentUid = toRoamDateUid(today);
createPageTitleObserver({
  title,
  log: true,
  callback: (d: HTMLDivElement) => {
    const tags = new Set(getLinkedPageTitlesUnderUid(parentUid));
    if (!tags.has("Grain Import")) {
      const parent = document.createElement("div");
      parent.id = "roamjs-grain-feed";
      d.firstElementChild.insertBefore(
        parent,
        d.firstElementChild.firstElementChild.nextElementSibling
      );
      render(parent, { parentUid, date: today });
    }
  },
});
