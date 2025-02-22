/** 
 * @author NTKhang
 * ! The source code is written by NTKhang, please don't change the author's name everywhere. Thank you for using 
 */
const axios = require("axios");
const chalk = require("chalk");
const fs = require("fs-extra");

const { NODE_ENV } = process.env;
process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const dirConfig = `${__dirname}/config${['test', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`;
const dirConfigCommands = `${__dirname}/configCommands${['test', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`;
const dirAccount = `${__dirname}/account${['test', 'development'].includes(NODE_ENV) ? '.dev.txt' : '.txt'}`;
const config = require(dirConfig);
const configCommands = require(dirConfigCommands);

global.GoatBot = {
	commands: new Map(),
	eventCommands: new Map(),
	aliases: new Map(),
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	config,
	configCommands,
	envCommands: {},
	envEvents: {},
	envGlobal: {}
};

global.db = {
	allThreadData: [],
	allUserData: [],
	threadModel: null,
	userModel: null,
	userDashboardModel: null,
	threadsData: null,
	usersData: null,
	dashBoardData: null
};

global.client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: []
	},
	commandBanned: configCommands.commandBanned
};

const utils = require("./utils.js");
global.utils = utils;

global.temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [], // Can't get info of groups with instagram members
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	}
};

// ———————————————— LOAD LANGUAGE ———————————————— //
let pathLanguageFile = `${__dirname}/languages/${global.GoatBot.config.language}.lang`;
if (!fs.existsSync(pathLanguageFile)) {
	utils.log.warn("LANGUAGE", `Can't find language file ${global.GoatBot.config.language}.lang, using default language file "${__dirname}/languages/en.lang"`);
	pathLanguageFile = `${__dirname}/languages/en.lang`;
}
const readLanguage = fs.readFileSync(pathLanguageFile, "utf-8");
const languageData = readLanguage
	.split(/\r?\n|\r/)
	.filter(line => line && !line.trim().startsWith("#") && !line.trim().startsWith("//") && line != "");

global.language = {};
for (const sentence of languageData) {
	const getSeparator = sentence.indexOf('=');
	const itemKey = sentence.slice(0, getSeparator).trim();
	const itemValue = sentence.slice(getSeparator + 1, sentence.length).trim();
	const head = itemKey.slice(0, itemKey.indexOf('.'));
	const key = itemKey.replace(head + '.', '');
	const value = itemValue.replace(/\\n/gi, '\n');
	if (!global.language[head])
		global.language[head] = {};
	global.language[head][key] = value;
}

function getText(head, key, ...args) {
	if (!global.language[head]?.[key])
		return `Can't find text: "${head}.${key}"`;
	let text = global.language[head][key];
	for (let i = args.length - 1; i >= 0; i--)
		text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
	return text;
}
global.utils.getText = getText;

(async () => {
	// ———————————————— CHECK VERSION ———————————————— //
	const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
	const currentVersion = require("./package.json").version;
	if (compareVersion(version, currentVersion) === 1)
		utils.log.master("NEW VERSION", getText("index", "newVersionDetected", chalk.grey(currentVersion), chalk.hex("#eb6a07")(version)));
	// —————————— CHECK FOLDER GOOGLE DRIVE —————————— //
	const parentIdGoogleDrive = await utils.drive.checkAndCreateParentFolder("GoatBot");
	utils.drive.parentID = parentIdGoogleDrive;
	// ———————————————————— LOGIN ———————————————————— //
	require(`./bot/login/login${NODE_ENV === 'development' ? '.dev.js' : '.js'}`);
})();

function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i])) return 1;
		if (parseInt(v1[i]) < parseInt(v2[i])) return -1;
	}
	return 0;
}
