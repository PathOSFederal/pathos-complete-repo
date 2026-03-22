"use strict";

import path from "node:path";

const resolveAppHtmlPath = () =>
  path.resolve(process.cwd(), "src", "renderer", "index.html");

export default resolveAppHtmlPath;
