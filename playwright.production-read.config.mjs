import base from './playwright.routes.config.mjs';
export default {...base,testMatch:'production-read.spec.mjs',outputDir:'test-results/production-read',use:{...base.use,baseURL:'https://raquel-loja-ew91.vercel.app'}};
