import {
  createPageTitleObserver,
  getLinkedPageTitlesUnderUid,
  getPageUidByPageTitle,
  getShallowTreeByParentUid,
  toConfig,
  toRoamDate,
  toRoamDateUid,
} from "roam-client";
import { createConfigObserver, toFlexRegex } from "roamjs-components";
import GrainLogo from "./assets/grain.svg";
import { getRecordings, outputRecordings, render } from "./GrainFeed";
import { IMPORT_LABEL } from "./util";

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
      {
        id: "import",
        fields: [
          {
            title: "auto import",
            type: "flag",
            description:
              "Automatically import recordings each day instead of showing an import dialog",
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
    if (!tags.has(IMPORT_LABEL)) {
      const importTree = getShallowTreeByParentUid(
        getPageUidByPageTitle(CONFIG)
      ).find((t) => toFlexRegex("import").test(t.text));
      if (
        importTree?.uid &&
        getShallowTreeByParentUid(importTree?.uid).some((t) =>
          toFlexRegex("auto import").test(t.text)
        )
      ) {
        getRecordings().then((r) =>
          outputRecordings(r.data.recordings, parentUid)
        );
      } else {
        const parent = document.createElement("div");
        parent.id = "roamjs-grain-feed";
        d.firstElementChild.insertBefore(
          parent,
          d.firstElementChild.firstElementChild.nextElementSibling
        );
        render(parent, { parentUid });
      }
    }
  },
});
