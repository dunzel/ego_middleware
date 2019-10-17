/**
 * Generated by 'generator-ego' (https://github.com/egodigital/generator-ego)
 *
 * by e.GO Digital GmbH, Aachen, Germany (https://e-go-digital.com)
 */

import * as _ from 'lodash';
import * as api_v1_root from './api/v1/root';
import * as contracts from './contracts';
import * as egoose from '@egodigital/egoose';
import * as express from 'express';
import * as mongodb from './mongodb';
import * as mongoose from 'mongoose';

type InitApiAction = (api: contracts.ApiContext, root: express.Router) => void;

/**
 * Creates a new host instance.
 *
 * @return {express.Express} The host instance.
 */
export function createHost() {
    const HOST = express();

    const LOGGER = egoose.createLogger();

    const API: contracts.ApiContext = {
        host: HOST,
        withDatabase: async function(func, useTransaction?) {
            useTransaction = !!useTransaction;

            const DB = mongodb.Database
                .fromEnvironment();

            await DB.connect();

            let session: mongoose.ClientSession;
            if (useTransaction) {
                session = await DB.mongo.startSession();
            }

            try {
                if (session) {
                    session.startTransaction();
                }

                const RESULT = await func(DB);

                if (session) {
                    await session.commitTransaction();
                }

                return RESULT;
            } catch (e) {
                if (session) {
                    await session.abortTransaction();
                }

                throw e;
            } finally {
                await DB.disconnect();
            }
        },
        logger: LOGGER,
    };

    HOST.use((req, res, next) => {
        req['logger'] = LOGGER;

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "*,Content-Type,Authorization");
        res.header("Access-Control-Allow-Methods", "*,GET,POST,PUT,DELETE,PATCH");

        res.header('X-Powered-By', 'eGO Digital GmbH Aachen Germany');
        res.header('X-Tm-Mk', '1979-09-05 23:09:19.790');

        return next();
    });

    // log to (MongoDB) database
    LOGGER.addAction((ctx) => {
        (async () => {
            await API.withDatabase(async (db) => {
                let tag = egoose.normalizeString(ctx.tag);
                if ('' === tag) {
                    tag = undefined;
                }

                let msg = ctx.message;
                if (!_.isNil(msg)) {
                    msg = JSON.stringify(msg, null, 2);
                }

                await db.Logs.insertMany([{
                    message: msg,
                    tag: tag,
                    time: ctx.time.toDate(),
                    type: ctx.type,
                }]);
            });
        })();
    });

    if (egoose.IS_DEV || egoose.IS_LOCAL_DEV) {
        // log any request in development mode(s)

        HOST.use((req: contracts.RequestWithLogger, res, next) => {
            try {
                req.logger.trace({
                    orgUrl: req.originalUrl,
                    path: req.path,
                    request: {
                        headers: req.headers,
                    },
                    socket: {
                        addr: req.socket.remoteAddress,
                        port: req.socket.remotePort,
                        type: req.socket.remoteFamily,
                    },
                    url: req.url,
                }, 'request');
            } catch { }

            return next();
        });
    }

    // v1 API
    {
        const v1_ROOT = express.Router();
        HOST.use('/api/v1', v1_ROOT);

        // extend that list if other
        // action for initializing endpoints
        const INIT_ACTION: InitApiAction[] = [
            api_v1_root.init,
        ];

        for (const ACTION of INIT_ACTION) {
            ACTION(API, v1_ROOT);
        }
    }

    return HOST;
}

(async () => {
    mongodb.initDatabase();

    const HOST = createHost();

    let port = parseInt(egoose.toStringSafe(process.env.APP_PORT).trim());
    if (isNaN(port)) {
        if (egoose.IS_LOCAL_DEV) {
            port = 8080;
        } else {
            port = 80;
        }
    }

    let host = egoose.toStringSafe(process.env.APP_HOST).trim();
    if ('' === host) {
        host = '0.0.0.0';
    }

    HOST.listen(port, host, () => {
        if (egoose.IS_LOCAL_DEV) {
            console.log(
                `API now runs on http://${host}:${port} ...`
            );
        }
    });
})();