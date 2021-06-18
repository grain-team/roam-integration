import {
  addStyle,
  createBlock,
  createBlockObserver,
  createIconButton,
  createPageTitleObserver,
  deleteBlock,
  getLinkedPageTitlesUnderUid,
  getPageUidByPageTitle,
  getShallowTreeByParentUid,
  getUids,
  toConfig,
  toRoamDate,
  toRoamDateUid,
} from "roam-client";
import { createConfigObserver, toFlexRegex } from "roamjs-components";
import GrainLogo from "./assets/grain.svg";
import {
  fetchEachRecording,
  getRecordings,
  outputRecordings,
  render,
} from "./GrainFeed";
import { render as renderLoadingAlert } from "./LoadingAlert";
import { IMPORT_LABEL, mockApi, mockHighlights, mockRecordings } from "./util";

addStyle(`.grain-loading-alert .bp3-alert-footer {
  display: none;
}

.grain-loading-alert .bp3-alert-contents {
  margin:auto;
}

.grain-loading-alert.bp3-alert {
  max-width: fit-content;
}`);

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

createBlockObserver((b: HTMLDivElement) => {
  if (!b.hasAttribute("data-grain-refresh-import")) {
    const isImport = Array.from(
      b.getElementsByClassName("rm-page-ref--tag")
    ).some((r) => r.getAttribute("data-tag") === IMPORT_LABEL);
    if (isImport) {
      b.setAttribute("data-grain-refresh-import", "true");
      const updateButton = createIconButton("refresh");
      updateButton.style.float = "right";
      updateButton.onmousedown = (e) => e.stopPropagation();
      updateButton.onclick = () => {
        const { blockUid } = getUids(b);
        const recordings = window.roamAlphaAPI
          .q(
            `[:find ?t ?o ?u :where [?p :node/title ?t] [?c :block/uid ?u] [?c :block/order ?o] [?c :block/refs ?p] [?b :block/children ?c] [?b :block/uid "${blockUid}"]]`
          )
          .sort(([_, a], [__, b]) => a - b)
          .map((b) => ({ text: b[0] as string, uid: b[2] as string }));
        renderLoadingAlert({
          operation: () => {
            getShallowTreeByParentUid(blockUid).forEach(({ uid }) =>
              deleteBlock(uid)
            );
            return fetchEachRecording(
              recordings.map((r) => {
                deleteBlock(r.uid);
                return mockRecordings.find((mr) => mr.title === r.text);
              })
            ).then((rs) => {
              rs.forEach((node, order) =>
                createBlock({ node, order, parentUid: blockUid })
              );
            });
          },
        });
      };
      b.appendChild(updateButton);
    }
  }
});
