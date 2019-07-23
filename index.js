#!/usr/bin/env node

import path from 'path';
import Inquirer from 'inquirer';
import _ from 'lodash';

import {
  fileSettings,
  dataSettings,
  pathSettings,
  messageSettings
} from './settings';
import { fileUtils, hbsUtils, questionUtils } from './utilities';

const inputFile = `${fileSettings.package.name}.${fileSettings.package.ext}`;
const outputFile = `${fileSettings.readme.name}.${fileSettings.readme.ext}`;

const checkFormatterFiles = async fileArray => {
  const check = [];

  await Promise.all(
    fileArray.map(async file => {
      await fileUtils
        .checkFileExist(file.path)
        .then(() => {
          check.push(file.name);
        })
        .catch(() => null);
    })
  );

  return { formatters: check };
};

const parseQuestions = async questionsPath => {
  const questions = [];
  const questionEdited = [];
  const { directory, files } = await fileUtils.readDirectoryFiles(
    questionsPath
  );
  const { formatters } = await checkFormatterFiles(fileSettings.formatters);

  await Promise.all(
    files.map(async file => {
      await fileUtils
        .readFile(path.join(directory, file))
        .then(res => questions.push(...JSON.parse(res)));
    })
  );

  questionEdited.push(
    questionUtils.injectChoices('formatters', questions, formatters)
  );

  messageSettings.questionTitle('Extra questions');
  return Inquirer.prompt(...questionEdited);
};

const run = async () => {
  messageSettings.mainTitle('Readme\nGenerator');
  try {
    await fileUtils.checkFileExist(fileSettings.package.path);
  } catch (error) {
    throw new Error(messageSettings.readFileError(inputFile));
  }

  const templateFile = await fileUtils.readFile(fileSettings.template.path);
  const templateData = _.merge(
    {},
    _.pick(
      JSON.parse(await fileUtils.readFile(fileSettings.package.path)),
      dataSettings
    ),
    await parseQuestions(pathSettings.readme.questions)
  );

  try {
    await fileUtils.writeFile(
      fileSettings.readme.path,
      hbsUtils.generateHandlebar(templateFile, templateData)
    );
    messageSettings.writeFileSuccess(outputFile);
  } catch (error) {
    throw new Error(messageSettings.writeFileError(outputFile));
  }
};

run();
