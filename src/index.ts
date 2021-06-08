import { toConfig, createPage } from "roam-client";

const CONFIG = toConfig("grain");
createPage({ title: CONFIG });
