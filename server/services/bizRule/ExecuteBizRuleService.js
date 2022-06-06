/* eslint-disable no-param-reassign */
/* eslint-disable arrow-parens */
/* eslint-disable no-else-return */
/* eslint-disable no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import * as ActionsServices from './BizRuleActionServices';
import * as ConditionsServices from './BizRuleConditionServices';

let isPreview;
let docCompare;

export const runSingleBizRule = async (inputData, bizRule, extendData, preview = true) => {
  isPreview = preview;
  const conditionsPassed = await ConditionsServices.checkConditions(inputData.mainField, bizRule, extendData, isPreview);
  if (conditionsPassed) {
    const output = await ActionsServices.doActions(inputData, bizRule, extendData, isPreview);
    return output;
  }
  // Don't pass condition
  return { ...inputData, ...extendData };
};

export const runBizRuleByField = async (inputData, allBiz, extendData, preview = true) => {
  isPreview = preview;
  let output = { ...inputData };
  let bizHasError = false;
  let errorDetail = '';
  for (let i = 0; i < allBiz.length; i++) {
    let error = false;
    try {
      const runResult = await runSingleBizRule(output, allBiz[i], extendData, isPreview);
      output = runResult;
    } catch (err) {
      errorDetail = err.message;
      error = true;
    }

    if (!isPreview) {
      for (const field of docCompare) {
        if (field.biz_rule.length > 0) {
          for (const rule of field.biz_rule) {
            if (rule.biz_rule_id === allBiz[i].biz_rule_id) {
              const checkArray = Array.isArray(output.mainField) && output.mainField.length > 0;
              const checkArrayOfString = checkArray && typeof output.mainField[0] === 'string';
              const isString = typeof output.mainField === 'string';
              const wrongOutputFormat = !checkArrayOfString && !isString;
              if (wrongOutputFormat) errorDetail = 'Wrong output format';
              const isError = error || wrongOutputFormat;
              if (isError) bizHasError = true;
              rule.after_rule = isError ? inputData.mainField : output.mainField;
              if (!rule.error) rule.error = isError;
              if (!rule.errorDetail && rule.error) rule.errorDetail = errorDetail;
              break;
            }
          }
        }
      }
    }
  }
  return bizHasError ? inputData : output;
};

export const runBizRuleByDoc = async (docData, allBiz, outputCompare, allDocTypeFields) => {
  let conditionsField = ConditionsServices.getConditionFields(docData, allBiz);
  // Add doc_fld_id to all single biz
  const docDataFields = Object.keys(docData);
  isPreview = false;
  docCompare = outputCompare;

  // Format document to run easier
  const docFormatted = Object.entries(docData).reduce(
    (obj, crr) => ({
      ...obj,
      [crr[0]]: crr[1].data,
    }),
    {},
  );

  // Set origin data for docCompare
  for (let i = 0; i < docCompare.length; i++) {
    for (const key of Object.keys(docFormatted)) {
      if (docCompare[i].doc_fld_id === key) {
        docCompare[i].origin = docFormatted[key];
        if (docCompare[i].biz_rule.length === 0) {
          docCompare[i].after_rule = docFormatted[key];
        }
        break;
      }
    }
  }

  let lastCondFldsId = []; // Condition fields ID of last run
  let currCondFldsId = []; // Condition fields ID of current run

  while (JSON.stringify(conditionsField).indexOf('"isRun":false') > -1) { // Check all field were ran
    /* --- Start check for loop condition fields
      A field that has condition fields (other fields that used to check condition)
      must be ran after all condition fields were run
      So there might be a case user defines biz rules that form an infinite loop ex:
        A: need condition fields B
        B: need condition fields C
        ....
        Z: need condition fields A
      The below block code will handle for those case and set error "Infinite loop condition"
      for those biz and skip them
    */
    if (
      (lastCondFldsId.length === 0 && currCondFldsId.length > 0) ||
      lastCondFldsId.sort().join(',') !== currCondFldsId.sort().join(',')
    ) {
      // After the first time run, this condition will pass and save the condition fields to compare later
      lastCondFldsId = currCondFldsId;
    } else if (
      /* Check if lastCondFldsId is same with currCondFldsId
      if true there is infinite loop, we will set all rule of these field are loop error */
      lastCondFldsId.length > 0 &&
      lastCondFldsId.sort().join(',') === currCondFldsId.sort().join(',')
    ) {
      currCondFldsId.forEach(item => {
        // Iterate through all requiredFields to set this fields "isRun = true"
        conditionsField = setFieldIsRun(conditionsField, item.doc_fld_id);
        // Set error for rule of this field that has loop condition
        for (let i = 0; i < docCompare.length; i++) {
          if (docCompare[i].doc_fld_id === item.doc_fld_id) {
            docCompare[i].biz_rule[item.index].error = true;
            docCompare[i].biz_rule[item.index].errorDetail = 'Infinite loop condition';
          }
        }
      });
    }
    // --- End check for loop condition fields

    currCondFldsId = [];
    // Iterate through all fields of document
    for (let i = 0; i < docDataFields.length; i++) {
      // Iterate through all biz rule of document type
      for (let j = 0; j < allBiz.length; j++) {
        if (allBiz[j].doc_fld_id == docDataFields[i]) {
          const input = { mainField: docFormatted[docDataFields[i]] };
          // Case when field is not run and has conditions with all conditions were run
          const fieldWithAllConditionswWereRun =
            conditionsField[docDataFields[i]].requiredFields.length > 0 &&
            JSON.stringify(conditionsField[docDataFields[i]].requiredFields).indexOf('"isRun":false') === -1 &&
            !conditionsField[docDataFields[i]].isRun;
          // Case when field is not run and don't has conditions
          const fieldDontHasCondition =
            !conditionsField[docDataFields[i]].isRun && conditionsField[docDataFields[i]].requiredFields.length === 0;

          if (fieldWithAllConditionswWereRun || fieldDontHasCondition) {
            let output = { ...input };
            output = await runBizRuleByField(input, allBiz[j].biz_rule, docFormatted, false);

            // Set new value to document
            let mainFieldKey = '';
            Object.keys(output).forEach(key => {
              if (key === 'mainField') {
                docFormatted[docDataFields[i]] = output.mainField;
                mainFieldKey = docDataFields[i];
                // avoid re-set value for mainfield
              } else if (key !== mainFieldKey) {
                docFormatted[key] = output[key];
              }
            });

            // Set value for docCompare
            for (let i = 0; i < docCompare.length; i++) {
              for (const key of Object.keys(docFormatted)) {
                if (docCompare[i].doc_fld_id === key) {
                  docCompare[i].after_rule = docFormatted[key];
                  break;
                }
              }
            }

            conditionsField[docDataFields[i]].isRun = true;
            conditionsField[docDataFields[i]].runTime += 1;
            // Iterate through all requiredFields to set this fields "isRun = true"
            conditionsField = setFieldIsRun(conditionsField, docDataFields[i]);
          } else {
            const currCondFlds = conditionsField[docDataFields[i]].requiredFields;
            for (const field of currCondFlds) {
              if (!field.isRun) {
                const element = {
                  doc_fld_id: field.doc_fld_id,
                  index: field.rule_index,
                };
                currCondFldsId.push(element);
              }
            }
          }
        }
      }
    }
  }
  // process for wrapping exceed
  Object.keys(docFormatted).forEach(fieldId => {
    if (fieldId.includes('-wrapping')) {
      const exceedFieldId = fieldId.replace('-wrapping', '');
      docFormatted[exceedFieldId] = docFormatted[exceedFieldId]
        ? docFormatted[exceedFieldId] + docFormatted[fieldId]
        : docFormatted[fieldId].replace('\n\n', '');
      delete docFormatted[fieldId];
    }
  });

  // apply fields that document missing with doc type to avoid error on return origin format
  Object.keys(allDocTypeFields).forEach(fieldId => {
    if (!docData[fieldId]) {
      docData[fieldId] = allDocTypeFields[fieldId];
    }
  });

  // return origin format
  const syncDocFormat = Object.entries(docFormatted).reduce(
    (obj, crr) => ({
      ...obj,
      [crr[0]]: { data: crr[1], confdt: docData[crr[0]]?.confdt || [] },
    }),
    {},
  );

  return { docData: syncDocFormat, docCompare };
};

// This function will iterate through all requiredFields to set currentFieldId "isRun = true"
export const setFieldIsRun = (conditionsField, currentFieldId) => {
  const newConditionField = { ...conditionsField };
  Object.keys(newConditionField).forEach(key => {
    if (newConditionField[key].requiredFields.length > 0) {
      newConditionField[key].requiredFields.forEach(el => {
        if (el.doc_fld_id === currentFieldId) {
          el.isRun = true;
          el.runTime += 1;
        }
      });
    }
  });
  return newConditionField;
};

// Function used to return the format of fields data for preview function
export const hanldeExtractExtendOuput = (output, extendParam) => {
  const extendOutputToArray = Object.entries(extendParam).map(item => [item[0], Object.keys(item[1])[0]]);
  const outputReturn = extendOutputToArray.reduce(
    (obj, crr) => ({
      ...obj,
      [crr[0]]: output[crr[1]],
    }),
    {},
  );
  outputReturn.mainField = output.mainField;
  return outputReturn;
};
