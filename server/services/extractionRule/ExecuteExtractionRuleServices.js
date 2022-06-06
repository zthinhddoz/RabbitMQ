/* eslint-disable no-loop-func */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable arrow-parens */
/* eslint-disable no-restricted-syntax */
import CommonDataServices from '../common-data/CommonDataServices';
import { combineComDatVal } from '../CoreServiceAPI';
import * as Functions from './ExtractionRuleFunctions';
import logger from '~/shared/logger';

export const runSingleExtrRule = async (input, rule) => {
  let fieldData = [];
  let matchWords = null;
  let newInput = `${input}`; // Deep copy
  let indexMatch = [];
  const ruleData = typeof rule.extr_rule_ctnt === 'string' ? JSON.parse(rule.extr_rule_ctnt) : rule.extr_rule_ctnt;
  const regexArray = ruleData.reg_expr_val;
  const commonInfo = ruleData.src_val;
  let regexParams = {};
  try {
    // Regex needs params
    if (commonInfo.length) {
      // Get the list of param in common data
      const commonIdArray = commonInfo.map(item => item.com_dat_id);
      const listCommonData = await CommonDataServices.getCommonData({ delt_flg: 'N', com_dat_id: commonIdArray });
      commonInfo.forEach(element => {
        const commonData = listCommonData.find(comData => comData.com_dat_id === element.com_dat_id);
        const comDataValue = JSON.parse(commonData.com_dat_val).data.filter(item => item.deleted === 'No');
        const paramArray = comDataValue.map(item => item[element.col_nm]);
        regexParams = { ...regexParams, [element.param]: paramArray };
      });
      for (const regexInfo of regexArray) {
        const { regex, action } = regexInfo;
        const currentParams = Functions.getParamFromRegex(regex);
        if (currentParams.length) {
          const regexCombination = [];
          // All possibleParams
          const combinationsArray = combineComDatVal(regexParams, currentParams);
          for (const val of combinationsArray) {
            let regexClone = `${regex}`;
            for (let index = 0; index < currentParams.length; index++) {
              const searchRegExp = new RegExp(`{{${currentParams[index]}}}`, 'g');
              regexClone = regexClone.replace(searchRegExp, `${val[index]}`);
              regexCombination.push(regexClone);
            }
          }
          const regexString = new RegExp(regexCombination.join('|'), 'g');
          matchWords = newInput.match(regexString);
          const output = handleMatchWords(matchWords, action, newInput, regexString, indexMatch, fieldData);
          indexMatch = action !== 'D' ? output.indexMatch : indexMatch;
          newInput = output.newInput;
          fieldData = output.fieldData;
        } else {
          const regexString = new RegExp(regex, 'g');
          matchWords = newInput.match(regexString);
          const output = handleMatchWords(matchWords, action, newInput, regexString, indexMatch, fieldData);
          indexMatch = action !== 'D' ? output.indexMatch : indexMatch;
          newInput = output.newInput;
          fieldData = output.fieldData;
        }
      }
    // Regex dont need params
    } else {
      for (const regexInfo of regexArray) {
        const { regex, action } = regexInfo;
        const regexString = new RegExp(regex, 'g');
        matchWords = newInput.match(regexString);
        const output = handleMatchWords(matchWords, action, newInput, regexString, indexMatch, fieldData);
        indexMatch = action !== 'D' ? output.indexMatch : indexMatch;
        newInput = output.newInput;
        fieldData = output.fieldData;
      }
    }
  } catch (error) {
    logger.error(error);
    return { newInput: input, fieldData: [] };
  }
  return { newInput, fieldData, indexMatch };
};

const handleMatchWords = (matchWords, action, newInput, regexString, indexMatch, fieldData) => {
  if (matchWords) {
    const { modifiedInput, outputData } = Functions.doActions(action, matchWords, newInput, regexString);
    indexMatch = Functions.getMatchIndexes(matchWords, newInput);
    newInput = modifiedInput;
    fieldData = [...fieldData, ...outputData];
  }
  const output = { indexMatch, newInput, fieldData };
  return output;
};

export const runMultiExtrRule = async (input, childFields, docFormatted) => {
  const docData = { ...docFormatted };
  const indexDataSet = {};
  let modifiedInput = input;
  for (const field of childFields) {
    if (field.dex_extr_rule.length && field.dex_extr_rule[0].delt_flg === 'N') {
      const { newInput, fieldData, indexMatch } = await runSingleExtrRule(modifiedInput, field.dex_extr_rule[0]);
      modifiedInput = newInput;
      if (fieldData) {
        docData[field.doc_fld_id] = fieldData;
        indexDataSet[field.doc_fld_id] = indexMatch;
      }
    }
  }
  const childsId = childFields.map(childField => childField.doc_fld_id);
  const childsData = {};
  // Get data of all childs
  Object.keys(docData).forEach(key => {
    if (childsId.includes(key)) {
      childsData[key] = docData[key];
    }
  });
  // Handle for case input data is missing at some row
  const orderedChildsData = Functions.handleEmpty(childsData, indexDataSet);
  Object.keys(orderedChildsData).forEach(key => {
    docData[key] = orderedChildsData[key];
  });
  return docData;
};

export const runExtrRuleByDoc = async (docData, allExtrRule) => {
  let docFormatted = Object.entries(docData).reduce(
    (obj, crr) => ({
      ...obj,
      [crr[0]]: crr[1].data,
    }),
    {},
  );
  allExtrRule.map(field => {
    if (field.child_fields.length) {
      field.child_fields.sort((a, b) => {
        const currentExtrRule = a.dex_extr_rule[0]?.extr_rule_ctnt;
        const nextExtrRule = b.dex_extr_rule[0]?.extr_rule_ctnt;
        if (currentExtrRule && nextExtrRule) {
          return Number(JSON.parse(currentExtrRule).ord_no) - Number(JSON.parse(nextExtrRule).ord_no);
        }
        return -1;
      });
    }
    return field;
  });
  for (const field of allExtrRule) {
    const currentFieldData = docFormatted[field.doc_fld_id];
    if (currentFieldData?.length) {
      // Case field has child
      if (field.child_fields.length) {
        const newDocData = await runMultiExtrRule(currentFieldData, field.child_fields, docFormatted);
        Object.keys(newDocData).forEach(fieldId => {
          docFormatted = Functions.modifyOutputData(docFormatted, newDocData[fieldId], docFormatted[fieldId], fieldId);
        });

      // Case field has no child
      } else {
        const { fieldData } = await runSingleExtrRule(currentFieldData, field.dex_extr_rule[0]);
        const fieldId = field.doc_fld_id;
        // For case run single rule -> always append new data if fieldData.length > 0
        if (fieldData.length) {
          docFormatted[fieldId] = Array.isArray(currentFieldData) ? fieldData : fieldData.join(' ');
        }
      }
    }
  }
  // return origin format
  const syncDocFormat = Object.entries(docFormatted).reduce(
    (obj, crr) => ({
      ...obj,
      [crr[0]]: { data: crr[1], confdt: docData[crr[0]]?.confdt },
    }),
    {},
  );
  return syncDocFormat;
};
