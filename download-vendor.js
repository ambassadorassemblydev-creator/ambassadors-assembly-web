import fs from 'fs';
import path from 'path';

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const downloadFile = async (url, dest) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed with status: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
};

const jsUrls = [
    "https://static.cdn-website.com/mnlt/production/6329/_dm/s/rt/dist/scripts/d-js-runtime-flex-package.min.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/runtime-module-layout.446b4afe23db0902d141.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/runtime-flex-link-on-container.7515607156f8bea4af38.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/runtime-module-anchors.aa582360c9b24e7b7508.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/913.19ab55ffb0169c2b1b4b.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/897.b704f9d0fc47fb69c82a.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/873.da9188333f2e97dd657d.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/250.9195d93d432c603c3bc7.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/292.054f2011e77bbb884f03.js",
    "https://static.cdn-website.com/mnlt/production/6329/editor/apps/modules/runtime/555.c6ea78822c83cbef4649.js",
    "https://d32hwlnfiv2gyn.cloudfront.net/sp-2.0.0-dm-0.1.min.js"
];

const cssUrls = [
    "https://static.cdn-website.com/mnlt/production/6329/_dm/s/rt/dist/css/d-css-runtime-flex.min.css",
    "https://irp.cdn-website.com/WIDGET_CSS/12c723454157c5842f3b41d7c6af0b3b.css",
    "https://irp.cdn-website.com/23c7a45a/files/23c7a45a_withFlex_1.min.css",
    "https://irp.cdn-website.com/23c7a45a/files/23c7a45a_home_withFlex_1.min.css"
];

(async () => {
    ensureDir('public/js/vendor');
    ensureDir('public/css/vendor');

    for (const url of jsUrls) {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname).replace(/\?.*$/, '');
        console.log(`Downloading ${fileName}...`);
        try {
            await downloadFile(url, path.join('public/js/vendor', fileName));
            console.log(`Successfully downloaded ${fileName}`);
        } catch (e) {
            console.error(`Failed to download ${fileName}: ${e.message}`);
        }
    }

    for (const url of cssUrls) {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname).replace(/\?.*$/, '');
        console.log(`Downloading ${fileName}...`);
        try {
            await downloadFile(url, path.join('public/css/vendor', fileName));
            console.log(`Successfully downloaded ${fileName}`);
        } catch (e) {
            console.error(`Failed to download ${fileName}: ${e.message}`);
        }
    }

    console.log("Downloads finished!");
})();
