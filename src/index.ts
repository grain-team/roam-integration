import {
  addStyle,
  createBlock,
  createBlockObserver,
  createIconButton,
  createPageTitleObserver,
  deleteBlock,
  getBasicTreeByParentUid,
  getCurrentPageUid,
  getLinkedPageTitlesUnderUid,
  getShallowTreeByParentUid,
  getUids,
  toRoamDate,
  toRoamDateUid,
} from "roam-client";
import {
  createConfigObserver,
  getSubTree,
  toFlexRegex,
} from "roamjs-components";
import GrainLogo from "./assets/grain.svg";
import {
  fetchEachRecording,
  getRecordings,
  outputRecordings,
  render,
} from "./GrainFeed";
import { render as renderLoadingAlert } from "./LoadingAlert";
import FormatPanel, {
  DEFAULT_RECORDING_FORMAT,
  DEFAULT_HIGHLIGHT_FORMAT,
  DEFAULT_PARTICIPANT_FORMAT,
} from "./FormatPanel";
import {
  CONFIG,
  getIdsImported,
  IMPORT_LABEL,
  getImportTree,
  getImportNode,
  getIdsImportedNode,
} from "./util";
import axios from "axios";
import pkceChallenge from "pkce-challenge";

const brand = "#00B96C";
const secondary = "#00D37B";

addStyle(`.grain-loading-alert .bp3-alert-footer {
  display: none;
}

.grain-loading-alert .bp3-alert-contents {
  margin:auto;
}

.grain-loading-alert.bp3-alert {
  max-width: fit-content;
}

button.bp3-button.bp3-intent-primary {
  background-color: ${secondary};
}

button.bp3-button.bp3-intent-primary:hover {
  background-color: ${brand};
}

.bp3-control input:checked ~ span.bp3-control-indicator {
  background-color: ${secondary};
}

.bp3-control:hover input:checked ~ span.bp3-control-indicator {
  background-color: ${brand};
}

.roamjs-grain-import-body .bp3-tab[aria-selected="true"] {
  background-color: ${brand} !important;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.16) !important;
  color: #FFFFFF;
}

.roamjs-grain-import-body .bp3-tab:not([aria-disabled="true"]):not([aria-selected="true"]):hover {
  color: ${brand};
}

.roamjs-grain-import-body .bp3-tab {
  padding: 0 8px;
  height: 32px;
  border-radius: 16px;
  color: #545454;
  text-align: center;
}

.roamjs-grain-import-body .bp3-tab-indicator-wrapper {
  display: none;
}

.roamjs-grain-import-body .bp3-tabs {
  margin-bottom: 24px;
}

.roamjs-grain-feed-body {
  max-height: 380px;
  min-height: 100px;
  overflow-y: scroll;
  padding: 16px;
  border: 1px solid #333333;
  border-radius: 4px;
  background: white;
}

.roamjs-grain-feed-body::-webkit-scrollbar {
  width: 8px;
}

.roamjs-grain-feed-body::-webkit-scrollbar-thumb {
  background: rgba(20, 20, 20, 0.5);
}

.bp3-dialog-header .bp3-heading {
  text-align: center;
}`);

const codeVerifierRef = { current: "" };
const generateCodeVerifier = () => {
  const { code_verifier, code_challenge } = pkceChallenge();
  codeVerifierRef.current = code_verifier;
  return code_challenge;
};
createConfigObserver({
  title: CONFIG,
  config: {
    brand,
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
                Promise.resolve(
                  `https://grain.co/_/public-api/oauth2/authorize?client_id=${
                    process.env.GRAIN_CLIENT_ID
                  }&response_type=code&code_challenge=${generateCodeVerifier()}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(
                    "https://roamjs.com/oauth?auth=true"
                  )}`
                ),
              getAuthData: (data) => {
                const body = {
                  grant_type: "authorization_code",
                  client_id: process.env.GRAIN_CLIENT_ID,
                  code: JSON.parse(data).code,
                  code_verifier: codeVerifierRef.current,
                };
                const formData = new FormData();
                Object.entries(body).forEach((e) => formData.append(...e));
                return axios
                  .post(
                    "https://grain.co/_/public-api/oauth2/token",
                    formData,
                    {
                      headers: {
                        "Content-Type": "multipart/form-data",
                      },
                    }
                  )
                  .then((r) =>
                    axios
                      .get("https://grain.co/_/public-api/me", {
                        headers: {
                          Authorization: `Bearer ${r.data.access_token}`,
                        },
                      })
                      .then((me) => ({ ...r.data, label: me.data.name }))
                  );
              },
            },
          },
        ],
      },
      {
        id: "import",
        fields: [
          {
            title: "recording format",
            type: "custom",
            description:
              "Specify the block format by which recordings are imported into your graph",
            defaultValue: [DEFAULT_RECORDING_FORMAT],
            options: {
              component: FormatPanel,
            },
          },
          {
            title: "highlight format",
            type: "custom",
            description:
              "Specify the block format by which highlights are imported into your graph",
            defaultValue: [DEFAULT_HIGHLIGHT_FORMAT],
            options: {
              component: FormatPanel,
            },
          },
          {
            title: "participant format",
            type: "custom",
            description:
              "Specify the block format by which participants are imported into your graph",
            defaultValue: [DEFAULT_PARTICIPANT_FORMAT],
            options: {
              component: FormatPanel,
            },
          },
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

const getImportSettings = (importTree = getImportTree()) => {
  const recordingFormat =
    getSubTree({ key: "recording format", tree: importTree }).children[0] ||
    DEFAULT_RECORDING_FORMAT;
  const highlightFormat =
    getSubTree({ key: "highlight format", tree: importTree }).children[0] ||
    DEFAULT_HIGHLIGHT_FORMAT;
  const participantFormat =
    getSubTree({ key: "participant format", tree: importTree }).children[0] ||
    DEFAULT_PARTICIPANT_FORMAT;
  const idsImported = getIdsImported(importTree);
  return { idsImported, recordingFormat, highlightFormat, participantFormat };
};

const today = new Date();
const title = toRoamDate(today);
const parentUid = toRoamDateUid(today);
createPageTitleObserver({
  title,
  log: true,
  callback: () => {
    const tags = new Set(getLinkedPageTitlesUnderUid(parentUid));
    if (!tags.has(IMPORT_LABEL)) {
      const importTree = getImportTree();
      const { idsImported, ...formats } = getImportSettings(importTree);
      if (importTree.some((t) => toFlexRegex("auto import").test(t.text))) {
        const ids = new Set(Object.values(idsImported));
        getRecordings().then((r) =>
          outputRecordings(
            r.data.recordings.map((i) => i.id).filter((id) => !ids.has(id)),
            parentUid,
            formats
          )
        );
      } else {
        render({ parentUid, idsImported, ...formats });
      }
    }
  },
});

createBlockObserver((b: HTMLDivElement) => {
  if (!b.hasAttribute("data-grain-refresh-import")) {
    const isImport = Array.from(
      b.getElementsByClassName("rm-page-ref--tag")
    ).some((r) => r.getAttribute("data-tag") === IMPORT_LABEL);
    const main = b.closest(".roam-block-container");
    const hasChildren =
      main &&
      !!main.querySelectorAll(".rm-block-children > .roam-block-container")
        .length;
    if (isImport && hasChildren) {
      b.setAttribute("data-grain-refresh-import", "true");
      const updateButton = createIconButton("refresh");
      const deleteButton = createIconButton("delete");
      const buttonHolder = document.createElement("span");
      buttonHolder.appendChild(updateButton);
      buttonHolder.appendChild(deleteButton);
      b.onmouseenter = b.onmousemove = () =>
        (buttonHolder.style.display = "flex");
      b.onmouseleave = () => (buttonHolder.style.display = "none");
      buttonHolder.style.float = "right";
      buttonHolder.style.display = "none";
      updateButton.style.width =
        updateButton.style.height =
        updateButton.style.minHeight =
        updateButton.style.minWidth =
        deleteButton.style.width =
        deleteButton.style.height =
        deleteButton.style.minHeight =
        deleteButton.style.minWidth =
          "16px";
      updateButton.style.margin = deleteButton.style.margin = "0 8px";
      buttonHolder.onmousedown = (e) => e.stopPropagation();
      updateButton.onclick = () => {
        const { blockUid } = getUids(b);
        renderLoadingAlert({
          operation: () => {
            const recordings = getBasicTreeByParentUid(blockUid);
            const { idsImported, ...formats } = getImportSettings();
            return fetchEachRecording(
              recordings
                .filter((r) => !!idsImported[r.uid])
                .map((r) => {
                  deleteBlock(r.uid);
                  return idsImported[r.uid];
                }),
              formats
            ).then((rs) => {
              rs.forEach((node, order) =>
                createBlock({ node, order, parentUid: blockUid })
              );
            });
          },
        });
      };
      deleteButton.onclick = () => {
        const { blockUid } = getUids(b);
        const idsImportedNode = getIdsImportedNode();
        const idsImported = Object.fromEntries(
          idsImportedNode.children.map((t) => [t.text, t.uid])
        );
        getShallowTreeByParentUid(blockUid).forEach(({ uid }) => {
          deleteBlock(uid);
          deleteBlock(idsImported[uid] || "");
        });
        deleteBlock(blockUid);
      };
      b.appendChild(buttonHolder);
    }
  }
});

window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: "Open Grain Feed",
  callback: () => {
    const settings = getImportSettings();
    render({ parentUid: getCurrentPageUid(), ...settings });
  },
});
