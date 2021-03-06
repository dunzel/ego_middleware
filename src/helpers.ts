/**
 * Generated by 'generator-ego' (https://github.com/egodigital/generator-ego)
 *
 * by e.GO Digital GmbH, Aachen, Germany (https://e-go-digital.com)
 */

import * as crypto from 'crypto';
import * as egoose from '@egodigital/egoose';

/**
 * Hashes a password.
 *
 * @param {any} pwd The password to hash.
 * @param {any} [salt] A custom salt value to use.
 *
 * @return {string} The hash.
 */
export function hashPassword(pwd: any, salt?: any): string {
    if (arguments.length < 2) {
        salt = process.env.PASSWORD_SALT;
    }

    if (!Buffer.isBuffer(pwd)) {
        pwd = Buffer.from(
            egoose.toStringSafe(pwd), 'utf8'
        );
    }

    if (!Buffer.isBuffer(salt)) {
        salt = Buffer.from(
            egoose.toStringSafe(salt), 'utf8'
        );
    }

    return crypto.createHmac('sha256', salt)
        .update(pwd)
        .digest('hex');
}
