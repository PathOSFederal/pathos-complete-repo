/* eslint-disable no-console */
"use strict";

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const hasList = args.includes("--list");
const filteredArgs = args.filter(function (arg) {
  return arg !== "--list";
});
const commandArgs = hasList ? ["list"] : ["run"];
const result = spawnSync("vitest", commandArgs.concat(filteredArgs), {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status === null ? 1 : result.status);
