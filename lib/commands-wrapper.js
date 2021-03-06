'use strict';

/*
 * Module for creating command's execution tree
 *
 * @example
 * browser
 *   .url('some/url')
 *   .customCommand('some/url')
 *   .click();
 *
 * customCommand() {
 *   return browser
 *     .title()
 *     .buttonPress();
 * }
 *
 * result tree:
 *  url
 *  customCommand
 *    title
 *    buttonPress
 *  click
 *    element
 *    elementIdClick
 */

const _ = require('lodash');
const Promise = require('bluebird');
const utils = require('./utils');

module.exports = (browser) => {
    const proto = Object.getPrototypeOf(browser);
    const commandsList = utils.filterProperties(Object.keys(proto));

    commandsList.forEach((commandName) => {
        const originCommand = browser[commandName].bind(browser);

        browser.addCommand(commandName, (...args) => {
            const dataTransfer = _.get(browser, 'executionContext.hermioneCtx');

            if (!dataTransfer) {
                return originCommand(...args);
            }

            dataTransfer.commandList = dataTransfer.commandList || [{
                name: 'root',
                cl: []
            }];

            /*
             * cn - command name
             * ts - time start
             * cl - command list
             */
            const cmd = {
                cn: commandName,
                ts: Date.now(),
                cl: []
            };

            _.last(dataTransfer.commandList).cl.push(cmd);
            dataTransfer.commandList.push(cmd);

            // wrap with Promise because of https://github.com/webdriverio/webdriverio/issues/1431
            return Promise.resolve(originCommand(...args))
                .finally(() => {
                    const command = _.last(dataTransfer.commandList);
                    command.d = Date.now() - command.ts;
                    dataTransfer.commandList.pop();
                });
        }, true);
    });
};
