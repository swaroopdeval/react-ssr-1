import React from 'react';
import Loadable from 'react-loadable';
import { renderToNodeStream } from 'react-dom/server';
import { getBundles } from 'react-loadable-ssr-addon';
import { StaticRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { renderRoutes } from 'react-router-config';
import Helmet from "react-helmet";
import path from 'path';
import fs from 'fs';
import Routes from '../../routes/routes';
const manifest = require('../../../public/dist/assets-manifest.json');

export default (pathname, res, store, context) => {
    const modules = new Set();
    const html = (
		<Loadable.Capture report={moduleName => modules.add(moduleName)}>
			<Provider store={ store }>
                <StaticRouter location={pathname} context={context}>
                    <div>{renderRoutes(Routes)}</div>
                </StaticRouter>
			</Provider>
		</Loadable.Capture>
    );

    res.setHeader('content-type', 'text/html; charset=utf-8');
    try{        
        res.write(getHeader());
        var reactDom = renderToNodeStream(html);
        reactDom.pipe(res, { end: false });
        reactDom.on('end', () => {
            res.end(getFooter(modules, store));
        });    
    }catch(ex){
        res.end(getError(ex));
    }
};

function getHeader(){
    const style_css = path.resolve(__dirname, "../../../public", "dist", "mobile.css");
    const cssText = fs.readFileSync(style_css, 'utf8');
    const helmet = nutrelizeHelmet(Helmet.renderStatic());
    return `<!doctype html>
    <html lang="en">
    <head>
        ${helmet}
        <meta http-equiv="content-type" content="text/html;charset=UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <style type="text/css">${cssText}</style>
    </head>
    <body><div id="app">`;
}

function getFooter(modules, store){
    const reduxState = JSON.stringify(store.getState()).replace(/</g, '\\u003c');
    const bundles = getBundles(manifest, [...manifest.entrypoints, ...Array.from(modules)]);
    //const styles = bundles.css || [];
    const scripts = bundles.js || [];
    return `</div><script type="text/javascript">window.INITIAL_STATE = ${ reduxState };</script>
        ${scripts.map(script => {
            if(script.file.indexOf('styles') !== -1){
                return '';
            }else{
                return `<script src="/dist/${script.file}" integrity="${script.integrity}" crossOrigin="anonymous" defer async></script>`
            }
        }).join('\n')}
    </body>
    </html>`;
}

function nutrelizeHelmet(helmet){
    const regex = /data-react-helmet="true" /gm;
    let title = helmet.title.toString();
    const meta = helmet.meta.toString();
    const link = helmet.link.toString();
    title = title.replace(' data-react-helmet="true" itemprop="name"', '');
    return title+meta.replace(regex, '')+link.replace(regex, '');
}