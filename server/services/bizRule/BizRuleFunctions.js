/* eslint-disable no-restricted-syntax */
export const handleAddToArray = (array, item, index) => [...array.slice(0, index), item, ...array.slice(index)];

export const getRuleAndOutputCompare = (ruleFields, extractedContent) => {
  // All fields of doc type
  const allDocTypeFields = ruleFields.reduce(
    (acc, field) => ({
      ...acc,
      [field.doc_fld_id]: {
        // For field that has display type table, data will be an array of text
        // otherwise data are text
        data: field.AdmDocFld.dp_tp_cd === 'T' ? [] : '',
        condft: [],
      },
    }),
    {},
  );

  // Rules for run biz logic
  const ruleFieldsFormatted = ruleFields
    .map(item => {
      const element = {
        doc_fld_id: item.doc_fld_id,
        fld_nm: item.AdmDocFld.fld_nm,
        biz_rule: item.DexBizRule,
      };
      return element;
    })
    .filter(item => item.biz_rule.length > 0);

  // Output for showing value before and after biz rules in Info-extracted page
  const outputCompare = ruleFields
    .map(item => {
      let bizRule = [];
      if (item.DexBizRule.length > 0) {
        bizRule = item.DexBizRule.map(el => ({
          biz_rule_id: el.biz_rule_id,
          ord_no: el.ord_no,
          biz_rule_desc: el.biz_rule_desc,
          after_rule: '',
          cre_dt: el.cre_dt,
          upd_dt: el.upd_dt,
        }));
      }
      const element = {
        doc_fld_id: item.doc_fld_id,
        adm_co_doc_fld_id: item.adm_co_doc_fld_id,
        fld_nm: item.AdmDocFld.fld_nm,
        fld_grp_flg: item.AdmDocFld.fld_grp_flg,
        origin: '',
        after_rule: '',
        biz_rule: bizRule,
      };
      return element;
    })
    .filter(item => item.fld_grp_flg !== 'Y' && Object.keys(extractedContent).includes(item.doc_fld_id));
  return { ruleFieldsFormatted, outputCompare, allDocTypeFields };
};

export const handleAlignByLengthRow = (line, limit) => {
  const output = [];
  const splitBySpace = line.split(' ');
  let tempStore = splitBySpace[0];
  for (let i = 1; i < splitBySpace.length; i++) {
    const afterAdd = `${tempStore} ${splitBySpace[i]}`;
    if (afterAdd.length > limit) {
      output.push(tempStore.trim());
      tempStore = splitBySpace[i];
    } else tempStore = afterAdd;
  }
  if (tempStore.length > 0) output.push(tempStore.trim());
  return output;
};

export const handleLimitRowHadMark = (array, limitPerRow, maximumRow, mark, newLine) => {
  let outputText = '';
  let exceedText = '';
  const maxRow = parseFloat(maximumRow);
  const tempArray = array.map(item => item);
  const afterAdd = tempArray[maxRow - 1] + mark;
  if (afterAdd.length <= limitPerRow) {
    const spaceCount = parseInt(limitPerRow - (tempArray[maxRow - 1] + mark).length);
    const parseSpace = [...Array(spaceCount).keys()].reduce((a, b) => `${a} `, '');
    const afterAddSpace = tempArray[maxRow - 1] + parseSpace + mark;
    const afterAddExceed = newLine ? `${mark}\n${tempArray[maxRow]}` : `${mark} ${tempArray[maxRow]}`;
    outputText = [...tempArray.slice(0, maxRow - 1), afterAddSpace].join('\n');
    exceedText = [afterAddExceed, ...tempArray.slice(maxRow + 1)].join('\n');
  } else {
    let spaceTotal = '';
    const lengthSpaceNeed = limitPerRow - mark.length - tempArray[maxRow - 1].toString().trim().length;
    for (let i = 0; i < lengthSpaceNeed; i++) spaceTotal += ' ';
    tempArray[maxRow - 1] = tempArray[maxRow - 1] + spaceTotal + mark;
    tempArray[maxRow] = newLine ? `${mark}\n${tempArray[maxRow]}` : `${mark} ${tempArray[maxRow]}`;
    outputText = tempArray.slice(0, maxRow).join('\n');
    exceedText = tempArray.slice(maxRow, tempArray.length).join('\n');
  }
  return { text: outputText, exceedText };
};

export const handleSplitByIndexSet = (string, indexSet) => {
  const output = [];
  for (let i = 0; i < indexSet.length; i++) {
    if (i === indexSet.length) output.push(string.slice(indexSet[i], string.length));
    else output.push(string.slice(indexSet[i], indexSet[i + 1]));
  }
  return output;
};

export const formatNumberWithComma = num => {
  const numSplit = num.toString().split('.');
  let output = parseInt(numSplit[0]).toLocaleString() + (numSplit[1] ? `.${numSplit[1]}` : '');
  if (output === 'NaN') output = '';
  return output;
};

export const handleArrayInput = async (input, actionValue, extendData, callbackFunction) => {
  const output = [];
  // For external actions
  if (input.mainField) {
    input = input.mainField.map(item => ({ mainField: item }));
    input.forEach(item => {
      output.push(callbackFunction(item, actionValue, extendData));
    });
    return { ...output[0], mainField: output.map(item => item.mainField) };
  }
  // For internal actions
  for (const item of input) {
    const result = await callbackFunction(item, actionValue, extendData);
    output.push(result);
  }
  return output;
};

export const splitStringByBreakLine = string => {
  const splitByBreakLineArray = [];
  let excuteString = string;
  let searchBreakLineChar = excuteString.search(/[\n\r]/);
  while (searchBreakLineChar !== -1) {
    splitByBreakLineArray.push(excuteString.slice(0, searchBreakLineChar));
    excuteString = excuteString.slice(searchBreakLineChar + 1, excuteString.length);
    searchBreakLineChar = excuteString.trim().search(/[\n\r]/);
  }
  if (excuteString.length > 0) splitByBreakLineArray.push(excuteString);
  return splitByBreakLineArray;
};

/* Convert array to only unit array or only value array
  Ex: [10 PK, 20 PK, 30 PK]
  -> only unit [PK, PK, PK]
  -> only value [10, 20, 30]
*/
export const getValueUnitArray = (input, part) => {
  const inputArray = convertPreviewStringToArray(input);
  let outputArray = null;
  if (part === 'unit') {
    outputArray = inputArray.map(item => item.replace(/[0-9]+/g, ''));
  } else if (part === 'value') {
    outputArray = inputArray.map(item => item.replace(/[A-z]+/g, ''));
  } else if (part === 'all') {
    outputArray = inputArray;
  }
  return outputArray.map(item => item.trim());
};

export const convertPreviewStringToArray = input => {
  let outputArray = [];
  // Use for preview function, to input an array user has two ways
  // 1: [one; two; three]
  // 2: [one
  //    two
  //    three]
  if (!Array.isArray(input) && input.toString().match(/^\[{1}[\w\W]+\]{1}$/g)) {
    input = input.replace(/[\[\]]/g, '');
    if (input.search('\n') !== -1) {
      outputArray = splitStringByBreakLine(input);
    } else if (input.search(';') !== -1) {
      outputArray = input.split(';');
    }
  } else if (Array.isArray(input)) {
    outputArray = [...input];
  } else return input;
  return outputArray;
};
