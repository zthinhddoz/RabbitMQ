/* eslint-disable no-loop-func */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-globals */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-expressions */
/* eslint-disable array-callback-return */
/* eslint-disable arrow-parens */
/* eslint-disable no-restricted-syntax */
import CommonDataServices from '../common-data/CommonDataServices';
import * as Functions from './BizRuleFunctions';

export const CONDITION_TYPE = {
  ALWAYS_RUN_ACTIONS: 'alway',
  SELECT_FIELD_VALUE: 'value',
  SELECT_FIELD_LENGTH: 'length',
  SELECT_OTHER_FIELD: 'extend',
  IN_COMMON_DATA: 'commonData',
  CHECK_TABLE_DATA: 'checkTableData',
};

export const CONDITION_TREE = {
  FIELD_NAME: 'field',
  COMPARE_TYPE: 'compare',
  COMPARE_VALUE: 'value',
  TABLE_NAME: 'tableName',
  COLUMN_NAME: 'columnName',
  COMMON_COLUMN_RETURN: 'columnReturn',
  COMMON_COMPARE_RETURN: 'compareReturn',
  SELECT: 'select',
};

export const COMPARE_CONDITION = {
  CT(inputData, value) {
    return containCondition(inputData, value);
  },
  NCT(inputData, value) {
    return notContainCondition(inputData, value);
  },
  BW(inputData, value) {
    return beginWithCondition(inputData, value);
  },
  EW(inputData, value) {
    return endWithCondition(inputData, value);
  },
  ET(inputData, value) {
    return equalToCondition(inputData, value);
  },
  II(inputData, value) {
    return includedInCondition(inputData, value);
  },
  NII(inputData, value) {
    return notIncludedInCondition(inputData, value);
  },
  AS(inputData, value) {
    return allSameCondition(inputData, value);
  },
  AU(inputData, value) {
    return allUniqueCondition(inputData, value);
  },
  HD(inputData, value) {
    return hasDupplicateCondition(inputData, value);
  },
  LT(inputData, value) {
    return lessThanCondition(inputData, value);
  },
  GT(inputData, value) {
    return greaterThanCondition(inputData, value);
  },
  LTOET(inputData, value) {
    return lessThanOrEqualToConditionLength(inputData, value);
  },
  GTOET(inputData, value) {
    return greaterThanOrEqualToConditionLength(inputData, value);
  },
  ST(inputData, value) {
    return shorterThanCondition(inputData, value);
  },
  LGT(inputData, value) {
    return longerThanCondition(inputData, value);
  },
  EQT(inputData, value) {
    return equalToConditionLength(inputData, value);
  },
  LGTOEQT(inputData, value) {
    return longerThanOrEqualToCondition(inputData, value);
  },
  STOEQT(inputData, value) {
    return shorterThanOrEqualToCondition(inputData, value);
  },
};

// Get condition fields to run biz logic by doc
export const getConditionFields = (docData, allBiz) => {
  const conditionFields = {};
  const ruleFieldsKey = Object.entries(allBiz).reduce((obj, crr) => [...obj, crr[1].doc_fld_id], []);
  for (const fieldId of Object.keys(docData)) {
    allBiz.forEach(bizField => {
      if (bizField.doc_fld_id === fieldId) {
        conditionFields[fieldId] = {};
        conditionFields[fieldId].requiredFields = [];
        conditionFields[fieldId].runTime = ruleFieldsKey.includes(fieldId) ? 0 : 1;
        conditionFields[fieldId].isRun = false;
        bizField.biz_rule.forEach(biz => {
          const condition = JSON.parse(biz.cond_ctnt);
          condition
            .map(item => item.value)
            .map(item => {
              if (item.length > 0) {
                item.forEach((el, index) => {
                  if (el.key === 'field' && el.value[0]) {
                    const condFldId = el.value[0].doc_fld_id;
                    // Required field must be different from current field
                    if (condFldId !== fieldId) {
                      // If field don't have biz logic, set isRun = true else false
                      const field = {
                        doc_fld_id: condFldId,
                        rule_index: index,
                        isRun: !ruleFieldsKey.includes(condFldId),
                        runTime: ruleFieldsKey.includes(condFldId) ? 0 : 1,
                      };
                      if (Object.keys(docData).includes(condFldId)) {
                        !conditionFields[fieldId].requiredFields.find(
                          element => element.doc_fld_id === field.doc_fld_id,
                        ) && conditionFields[fieldId].requiredFields.push(field);
                      }
                    }
                  }
                });
              }
            });
        });
      }
    });
  }
  return conditionFields;
};

export const checkConditions = async (inputData, bizRule, extendData, isPreview) => {
  const applyFlag = bizRule.cond_tp_cd;
  const allConditions = JSON.parse(bizRule.cond_ctnt);

  let conditionsPassed = applyFlag === 'ALL';
  for (let i = 0; i < allConditions.length; i++) {
    const type = allConditions[i].field;
    if (type === CONDITION_TYPE.ALWAYS_RUN_ACTIONS) {
      if (applyFlag === 'ALL') continue;
      else return true;
    }
    const conditionField = allConditions[i].value.find(el => el.key === CONDITION_TREE.FIELD_NAME);
    const compareType = allConditions[i].value.find(el => el.key === CONDITION_TREE.COMPARE_TYPE);
    const compareValue = allConditions[i].value.find(el => el.key === CONDITION_TREE.COMPARE_VALUE);
    if (type === CONDITION_TYPE.SELECT_OTHER_FIELD) {
      const conditionFieldValue = extendData[conditionField.value[0].doc_fld_id];
      conditionsPassed = await compareConditionCase(conditionFieldValue, compareType.value, compareValue.value);
    } else if (type === CONDITION_TYPE.IN_COMMON_DATA) {
      let conditionFieldValue = extendData[conditionField.value[0].doc_fld_id];
      if (isPreview && !conditionFieldValue) conditionFieldValue = inputData;
      const columnName = allConditions[i].value.find(el => el.key === CONDITION_TREE.COLUMN_NAME).value;
      const commonTable = allConditions[i].value.find(el => el.key === CONDITION_TREE.TABLE_NAME);
      const columnReturn = allConditions[i].value.find(el => el.key === CONDITION_TREE.COMMON_COLUMN_RETURN);
      const compareReturn = allConditions[i].value.find(el => el.key === CONDITION_TREE.COMMON_COMPARE_RETURN);
      const commonDataId = commonTable.value[0].com_dat_id;
      const matchData = await CommonDataServices.findMatchCommonData(
        commonDataId,
        columnName,
        compareType.value,
        conditionFieldValue,
        columnReturn.value,
        compareReturn?.value,
        compareValue?.value,
      );
      conditionsPassed = !!matchData.length;
    } else if (type === CONDITION_TYPE.CHECK_TABLE_DATA) {
      const extendFieldData = extendData[conditionField.value[0].doc_fld_id];
      const conditionFieldValue = typeof extendFieldData !== 'undefined' ? extendFieldData : inputData;
      const selectValue = allConditions[i].value.find(el => el.key === CONDITION_TREE.SELECT).value;
      conditionsPassed = await compareConditionCase(conditionFieldValue, compareType.value, selectValue, true);
    } else if (type === CONDITION_TYPE.SELECT_FIELD_LENGTH || type === CONDITION_TYPE.SELECT_FIELD_VALUE) {
      conditionsPassed = await compareConditionCase(inputData, compareType.value, compareValue.value);
    }
    if (applyFlag === 'ALL') {
      // For case check all condition, if any condition return false, stop the loop and return false
      if (!conditionsPassed) break;
    } else if (conditionsPassed) {
      // For case check any condition, if any condition return true, stop the loop and return true
      break;
    }
  }
  return conditionsPassed;
};

export const compareConditionCase = async (inputData, compare, value, tableCondition = false) => {
  let conditionPassed = false;
  if (inputData === undefined) return false;
  // Convert string to array for preview function
  const convertInput = Functions.convertPreviewStringToArray(inputData);
  // For case check table data, input is an array not item of array
  if (tableCondition) {
    conditionPassed = await COMPARE_CONDITION[compare](inputData, value);
  } else if (Array.isArray(convertInput)) {
    for (const item of convertInput) {
      conditionPassed = await COMPARE_CONDITION[compare](item, value);
      if (conditionPassed) break;
    }
  } else conditionPassed = await COMPARE_CONDITION[compare](convertInput, value);
  return conditionPassed;
};

export const containCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.toLowerCase().includes(item.toLowerCase()));

export const notContainCondition = (inputData, conditionValue) =>
  !conditionValue.some(item => inputData.toLowerCase().includes(item.toLowerCase()));

export const equalToCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.toLowerCase() === item.toLowerCase());

export const beginWithCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.toLowerCase().startsWith(item.toLowerCase()));

export const endWithCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.toLowerCase().endsWith(item.toLowerCase()));

export const includedInCondition = (inputData, conditionValue) =>
  conditionValue.some(item => item.toLowerCase().includes(inputData.toLowerCase()));

export const notIncludedInCondition = (inputData, conditionValue) =>
  !conditionValue.some(item => item.toLowerCase().includes(inputData.toLowerCase()));

export const allSameCondition = (inputData, conditionValue) => {
  const inputArray = Functions.getValueUnitArray(inputData, conditionValue);
  const uniqueInputArray = [...new Set(inputArray)];
  return uniqueInputArray.length === 1;
};

export const allUniqueCondition = (inputData, conditionValue) => {
  const inputArray = Functions.getValueUnitArray(inputData, conditionValue);
  const uniqueInputArray = [...new Set(inputArray)];
  return uniqueInputArray.length === inputArray.length;
};

export const hasDupplicateCondition = (inputData, conditionValue) => {
  const inputArray = Functions.getValueUnitArray(inputData, conditionValue);
  const uniqueInputArray = [...new Set(inputArray)];
  return uniqueInputArray.length < inputArray.length;
};

export const lessThanCondition = (inputData, conditionValue) =>
  conditionValue.some(item => !isNaN(inputData) && parseFloat(inputData) < parseFloat(item));

export const greaterThanCondition = (inputData, conditionValue) =>
  conditionValue.some(item => !isNaN(inputData) && parseFloat(inputData) > parseFloat(item));

export const lessThanOrEqualToConditionLength = (inputData, conditionValue) =>
  conditionValue.some(item => !isNaN(inputData) && parseFloat(inputData) <= parseFloat(item));

export const greaterThanOrEqualToConditionLength = (inputData, conditionValue) =>
  conditionValue.some(item => !isNaN(inputData) && parseFloat(inputData) >= parseFloat(item));

export const shorterThanCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.length < parseFloat(item));

export const longerThanCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.length > parseFloat(item));

export const equalToConditionLength = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.length === parseFloat(item));

export const shorterThanOrEqualToCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.length <= parseFloat(item));

export const longerThanOrEqualToCondition = (inputData, conditionValue) =>
  conditionValue.some(item => inputData.length >= parseFloat(item));
