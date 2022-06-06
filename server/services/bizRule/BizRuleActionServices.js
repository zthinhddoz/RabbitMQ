/* eslint-disable no-else-return */
/* eslint-disable radix */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prefer-template */
/* eslint-disable no-plusplus */
/* eslint-disable arrow-parens */
/* eslint-disable no-case-declarations */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-await-in-loop */
/* eslint-disable operator-linebreak */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-lonely-if */
import CommonDataServices from '../common-data/CommonDataServices';
import * as Functions from './BizRuleFunctions';
import logger from '~/shared/logger';

let wrappingKey;
let isPreview;
let inputStringIsProcessed = false;

export const ACTION_TYPES = {
  // internal actions: only modify value of itself
  INTERNAL: ['convert', 'delete', 'round', 'slice', 'formatValue', 'split'],
  // external actions: also modify value of other fields
  EXTERNAL: ['update', 'wrapping', 'copy', 'set', 'divideTotal'],
};

export const ACTION_FUNCTIONS = {
  // internal actions
  convert(inputMainField, actionValues) {
    return convertAction(inputMainField, actionValues);
  },
  delete(inputMainField, actionValues) {
    return deleteAction(inputMainField, actionValues);
  },
  round(inputMainField, actionValues) {
    return roundAction(inputMainField, actionValues);
  },
  slice(inputMainField, actionValues) {
    return sliceAction(inputMainField, actionValues);
  },
  formatValue(inputMainField, actionValues) {
    return formatValueAction(inputMainField, actionValues);
  },
  split(inputMainField, actionValues) {
    return splitAction(inputMainField, actionValues);
  },

  // external actions
  update(input, actionValues, extendData) {
    return updateAction(input, actionValues, extendData);
  },
  wrapping(input, actionValues, extendData) {
    return wrappingAction(input, actionValues, extendData);
  },
  copy(input, actionValues, extendData) {
    return copyAction(input, actionValues, extendData);
  },
  set(input, actionValues, extendData) {
    return setAction(input, actionValues, extendData);
  },
  divideTotal(input, actionValues, extendData) {
    return divideTotalAction(input, actionValues, extendData);
  },
};

export const doActions = async (input, bizRule, extendData, preview) => {
  const allActions = JSON.parse(bizRule.act_ctnt);
  isPreview = preview;
  let outputValue = input;
  // Reset the state when run other biz
  inputStringIsProcessed = false;
  for (let i = 0; i < allActions.length; i++) {
    const item = allActions[i];
    if (ACTION_TYPES.INTERNAL.includes(item.type)) {
      outputValue.mainField = await ACTION_FUNCTIONS[item.type](outputValue.mainField, item.value);
    } else {
      outputValue = await ACTION_FUNCTIONS[item.type](outputValue, item.value, extendData);
      setExtendData(outputValue, extendData);
    }
  }
  return outputValue;
};

// Function used to set new value to extendData
export const setExtendData = (outputValue, extendData) => {
  const checkOutputObject = typeof outputValue === 'object' && outputValue !== null;
  if (checkOutputObject) {
    Object.keys(outputValue).forEach(key => {
      if (key !== 'mainField') {
        extendData[key] = outputValue[key];
      }
    });
  }
};

export const convertAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, convertAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, convertAction);
    }
  }
  let outputConvert = '';
  inputPreview = inputPreview.replace(',', '');
  if (inputPreview.match(/[A-z]+/g)) return inputPreview;
  if (!isNaN(parseFloat(inputPreview))) {
    if (actionValue.convertRate.length > 0) outputConvert = parseFloat(inputPreview) * parseFloat(actionValue.convertRate);
    if (actionValue.fixedDigit === 'fixed' && actionValue.length) outputConvert = parseFloat(outputConvert).toFixed(parseInt(actionValue.length));
    else if (actionValue.fixedDigit === 'max' && actionValue.length) outputConvert = parseFloat(outputConvert.toFixed(parseInt(actionValue.length)));
    else if (actionValue.fixedDigit === 'none') outputConvert = parseFloat(outputConvert.toFixed(0));
    return outputConvert;
  }
};

export const deleteAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, deleteAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, deleteAction);
    }
  }
  let outputDelete = inputPreview;
  const { position } = actionValue;
  let { from } = actionValue;
  switch (position) {
    case 'match': {
      for (let i = 0; i < from.length; i++) {
        if (from[i] === '/*') outputDelete = '';
        else {
          while (outputDelete.includes(from[i])) outputDelete = outputDelete.replace(from[i], '');
        }
      }
      break;
    }
    case 'endAt': {
      for (let i = 0; i < from.length; i++) {
        if (outputDelete.includes(from[i].replace('--', ''))) {
          // Also remove the keyword
          if (from[i].length > 2 && from[i].slice(0, 2) === '--') {
            const indexOfChar = inputPreview.indexOf(from[i].slice(2));
            outputDelete = inputPreview.slice(indexOfChar, inputPreview.length);
            // Keep the keyword
          } else {
            const indexOfChar = inputPreview.indexOf(from[i]);
            outputDelete = inputPreview.slice(indexOfChar + from[i].length, inputPreview.length);
          }
          break;
        }
      }
      break;
    }
    case 'beginAt': {
      for (let i = 0; i < from.length; i++) {
        if (outputDelete.includes(from[i].replace('--', ''))) {
          // Also remove the keyword
          if (from[i].length > 2 && from[i].slice(0, 2) === '--') {
            const indexOfChar = inputPreview.indexOf(from[i].slice(2));
            outputDelete = inputPreview.slice(0, indexOfChar + from[i].length - 2);
            // Keep the keyword
          } else {
            const indexOfChar = inputPreview.indexOf(from[i]);
            outputDelete = inputPreview.slice(0, indexOfChar);
          }
          break;
        }
      }
      break;
    }
    case 'lineIndex': {
      let afterSplitInput = Functions.splitStringByBreakLine(outputDelete);
      const lineIndex = parseInt(actionValue.index);
      if (Math.abs(lineIndex) > afterSplitInput.length || afterSplitInput.length === 1) return outputDelete;
      if (lineIndex > 0) {
        afterSplitInput = afterSplitInput.splice(lineIndex, afterSplitInput.length);
      } else {
        afterSplitInput = afterSplitInput.splice(0, afterSplitInput.length + lineIndex);
      }
      outputDelete = afterSplitInput.join('\n');
      break;
    }
    case 'lineKeyword': {
      let afterSplitInput = Functions.splitStringByBreakLine(outputDelete);
      const keywordArray = actionValue.keyword;
      const action = actionValue.keywordAction;
      let lineIndex = null;
      for (const keyword of keywordArray) {
        for (const [index, row] of afterSplitInput.entries()) {
          if (row.includes(keyword)) {
            lineIndex = index;
            break;
          }
        }
        // if found the line
        if (lineIndex != null) break;
      }
      if (lineIndex != null) {
        if (action === 'deleteLine') afterSplitInput.splice(lineIndex, 1);
        else {
          const params = {
            deleteOther: [lineIndex, 1],
            deleteToStart: [lineIndex + 1, afterSplitInput.length],
            deleteToEnd: [0, lineIndex],
          };
          afterSplitInput = afterSplitInput.splice(params[action][0], params[action][1]);
        }
      }
      outputDelete = afterSplitInput.join('\n');
      break;
    }
    default:
      return outputDelete;
  }
  return outputDelete.trim();
};

export const updateAction = (inputPreview, actionValue, extendData) => {
  if (Array.isArray(inputPreview.mainField) && !inputStringIsProcessed) {
    return Functions.handleArrayInput(inputPreview, actionValue, extendData, updateAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview.mainField);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput({ mainField: convertedInput }, actionValue, extendData, updateAction);
    }
  }
  let outputUpdate = inputPreview;
  const outputProp = actionValue.field ? actionValue.field.doc_fld_id : 'mainField';
  // Case paste field is not current field
  if (outputProp !== 'mainField') outputUpdate[outputProp] = extendData[outputProp] || '';
  let inputContainCondition = false;
  // Exclude inputContainCondition for case select value or unit
  if (!['unit', 'value'].includes(actionValue.position)) {
    inputContainCondition = actionValue.from.includes('--')
      ? outputUpdate[outputProp].includes(actionValue.from.slice(2))
      : outputUpdate[outputProp].includes(actionValue.from);
  }
  if (actionValue.position.length === 0) outputUpdate = inputPreview;
  else if (actionValue.position === 'match') {
    if (actionValue.from === '/*') {
      actionValue.to === 'empty' ? (outputUpdate[outputProp] = '') : (outputUpdate[outputProp] = actionValue.to);
    } else {
      outputUpdate[outputProp] = inputContainCondition
        ? outputUpdate[outputProp].replace(new RegExp(actionValue.from, 'g'), actionValue.to)
        : outputUpdate[outputProp];
    }
  } else if (actionValue.position === 'endAt' && inputContainCondition) {
    if (actionValue.from.length > 2 && actionValue.from.slice(0, 2) === '--') {
      const indexOfChar = outputUpdate[outputProp].indexOf(actionValue.from.slice(2));
      outputUpdate[outputProp] = actionValue.to + outputUpdate[outputProp].slice(indexOfChar, inputPreview.length);
    } else {
      const indexOfChar = outputUpdate[outputProp].indexOf(actionValue.from);
      outputUpdate[outputProp] =
        actionValue.to + outputUpdate[outputProp].slice(indexOfChar + actionValue.from.length, outputUpdate[outputProp].length);
    }
  } else if (actionValue.position === 'beginAt' && inputContainCondition) {
    if (actionValue.from.length > 2 && actionValue.from.slice(0, 2) === '--') {
      const indexOfChar = outputUpdate[outputProp].indexOf(actionValue.from.slice(2));
      outputUpdate[outputProp] = outputUpdate[outputProp].slice(0, indexOfChar + actionValue.from.length - 2) + actionValue.to;
    } else {
      const indexOfChar = outputUpdate[outputProp].indexOf(actionValue.from);
      outputUpdate[outputProp] = outputUpdate[outputProp].slice(0, indexOfChar) + actionValue.to;
    }
  } else if (actionValue.position === 'unit') {
    outputUpdate[outputProp] = outputUpdate[outputProp].replace(/\b[ A-z]+\b/g, ` ${actionValue.to}`).trim();
  } else if (actionValue.position === 'value') {
    outputUpdate[outputProp] = outputUpdate[outputProp]
      .toString()
      .replace(/\b[0-9,.]+\b/g, ` ${actionValue.to}`)
      .trim();
  }
  return outputUpdate;
};

export const wrappingAction = async (inputPreview, actionValue, extendData) => {
  if (Array.isArray(inputPreview.mainField)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, wrappingAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview.mainField);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput({ mainField: convertedInput }, actionValue, null, wrappingAction);
    }
  }
  let outputWrapping = inputPreview;
  if (!wrappingKey) {
    const wrappingValue = await CommonDataServices.getCommonData({ com_dat_cd: 'CONSTANTS' }, ['com_dat_val']).catch(
      err => logger.error(err),
    );
    JSON.parse(wrappingValue[0].com_dat_val).data.forEach(item => {
      if (item.code === 'WRAPPING_KEY') {
        wrappingKey = JSON.parse(item.value);
      }
    });
  }

  if (inputPreview.mainField.length === 0) return inputPreview;

  let { mark } = actionValue;
  const maxRow = parseInt(actionValue.maxRow);
  const { markPosition } = actionValue;
  const { limitPerRow } = actionValue;

  // Split string by new line
  let splitByBreakLineArray = Functions.splitStringByBreakLine(inputPreview.mainField);

  // Handle special key : value
  splitByBreakLineArray = splitByBreakLineArray.map(item => {
    if (wrappingKey.some(el => item.toLowerCase().includes(el.toLowerCase()))) {
      const listIndex = wrappingKey.map(el => item.toLowerCase().indexOf(el.toLowerCase())).filter(el => el !== -1);
      const splitSpecial = Functions.handleSplitByIndexSet(item, listIndex);
      return splitSpecial;
    }
    return item;
  });

  // Unzip array
  splitByBreakLineArray = splitByBreakLineArray.reduce(
    (arr, crr) => (Array.isArray(crr) ? [...arr, ...crr] : [...arr, crr]),
    [],
  );

  // Limit per row phase
  const limitPerRowPhase = [];
  splitByBreakLineArray.forEach(item => {
    if (item.length > limitPerRow) {
      limitPerRowPhase.push(...Functions.handleAlignByLengthRow(item, limitPerRow));
    } else limitPerRowPhase.push(item);
  });

  const handleExtendWrapping = (exceedText, extendData) => {
    const exceedFieldId = actionValue.exceedField?.doc_fld_id;
    const exceedField = isPreview ? exceedFieldId : `${exceedFieldId}-wrapping`;
    const exceedFieldOutput = (extendData[exceedField] || '') + '\n\n' + exceedText;
    return { [exceedField]: exceedFieldOutput };
  };

  // Limit row phase
  if (maxRow && limitPerRowPhase.length > maxRow) {
    if (mark && markPosition) {
      let newLine = false;
      if (mark.includes('\\n')) {
        mark = mark.replace('\\n', '');
        newLine = true;
      }
      if (markPosition === 'end') {
        const { text, exceedText } = Functions.handleLimitRowHadMark(
          limitPerRowPhase,
          limitPerRow,
          maxRow,
          mark,
          newLine,
        );
        outputWrapping.mainField = text;
        outputWrapping = { ...outputWrapping, ...handleExtendWrapping(exceedText, extendData) };
      } else if (markPosition === 'begin') {
        outputWrapping.mainField = limitPerRowPhase.slice(0, maxRow).join('\n');
        const lineHasMark = newLine ? `${mark}\n${limitPerRowPhase[maxRow]}` : `${mark} ${limitPerRowPhase[maxRow]}`;
        const exceedText = [lineHasMark, ...limitPerRowPhase.slice(maxRow + 1, limitPerRowPhase.length)].join('\n');
        outputWrapping = { ...outputWrapping, ...handleExtendWrapping(exceedText, extendData) };
      } else if (markPosition === 'not') {
        const breakByMark = Functions.handleLimitRowHadMark(limitPerRowPhase, limitPerRow, maxRow, '');
        outputWrapping.mainField = breakByMark.text;
      }
    } else outputWrapping.mainField = limitPerRowPhase.slice(0, actionValue.maxRow).join('\n');
  } else outputWrapping.mainField = limitPerRowPhase.join('\n');
  return outputWrapping;
};

export const setAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview.mainField)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, setAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview.mainField);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput({ mainField: convertedInput }, actionValue, null, setAction);
    }
  }
  const outputSet = inputPreview;
  if (actionValue.field) {
    const fldCd = actionValue.field.doc_fld_id;
    outputSet[fldCd] = actionValue.to;
  } else outputSet.mainField = actionValue.to;
  return outputSet;
};

// Copy is special action that don't use handleArrayInput function
export const copyAction = (inputPreview, actionValue, extendData) => {
  const copyFieldValue = actionValue.copyFrom
    ? extendData[actionValue.copyFrom.doc_fld_id] || ''
    : inputPreview.mainField;
  let copyItem = null;
  let copyValue = null;

  // Copy field has array type
  if (actionValue.type !== 'normal') {
    const copyFieldArray = Functions.getValueUnitArray(copyFieldValue, 'all');
    if (actionValue.type === 'first') {
      [copyItem] = copyFieldArray; // Array destructuring
    } else if (actionValue.type === 'max' || actionValue.type === 'min') {
      // Get index of maxValue/minValue item
      const copyFieldValueArray = Functions.getValueUnitArray(copyFieldValue, 'value');
      const maxItemValue =
        actionValue.type === 'max' ? Math.max(...copyFieldValueArray) : Math.min(...copyFieldValueArray);
      copyItem = copyFieldArray[copyFieldValueArray.indexOf(maxItemValue.toString())];
    }
  } else copyItem = copyFieldValue;
  if (actionValue.copyPart === 'all') copyValue = copyItem;
  else if (actionValue.copyPart === 'unit') copyValue = copyItem.replace(/[0-9,.]+/g, '').trim();
  else copyValue = copyItem.replace(/[A-z]+/g, '').trim();

  const outputCopy = inputPreview;
  const outputProp = actionValue.copyTo ? actionValue.copyTo.doc_fld_id : 'mainField';
  // Case paste field is not current field
  if (outputProp !== 'mainField') outputCopy[outputProp] = extendData[outputProp] || '';
  if (actionValue.pastePart === 'all') outputCopy[outputProp] = copyValue;
  else if (actionValue.pastePart === 'unit') {
    outputCopy[outputProp] = outputCopy[outputProp].replace(/\b[ A-z]+\b/g, ` ${copyValue}`).trim();
  } else if (actionValue.pastePart === 'value') {
    outputCopy[outputProp] = outputCopy[outputProp].replace(/\b[0-9,.]+\b/g, copyValue).trim();
  } else if (actionValue.pastePart === 'first') {
    outputCopy[outputProp] = copyValue + (outputCopy[outputProp] ? ` ${outputCopy[outputProp]}` : '');
  } else {
    outputCopy[outputProp] = (outputCopy[outputProp] ? `${outputCopy[outputProp]} ` : '') + copyValue;
  }
  return outputCopy;
};

export const roundAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, roundAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, roundAction);
    }
  }
  let outputRound = inputPreview;
  if (!isNaN(parseFloat(outputRound))) {
    if (actionValue.round === 'fixed' && actionValue.length)
      outputRound = parseFloat(outputRound).toFixed(parseInt(actionValue.length));
    if (actionValue.round === 'max' && actionValue.length)
      outputRound = parseFloat(parseFloat(outputRound).toFixed(parseInt(actionValue.length)));
  }
  return outputRound;
};

export const sliceAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, sliceAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, sliceAction);
    }
  }
  let outputSlice = inputPreview;
  const { sliceType } = actionValue;
  const { from } = actionValue;
  const { to } = actionValue;
  if (sliceType === 'numToNum') {
    if (from < 1 || from >= to || to > inputPreview.length) return outputSlice;
    outputSlice = inputPreview.slice(from - 1, to);
  } else if (sliceType === 'numToString') {
    const checkToArray = Array.isArray(to) ? to : [to];
    const mapArrayTo = checkToArray.map(item => (item.slice(0, 2) === '--' ? item.slice(2) : item));
    const lengthArray = mapArrayTo.map(item => item.length);
    const indexOfArray = mapArrayTo.map(item => inputPreview.indexOf(item));
    for (let i = 0; i < indexOfArray.length; i++) {
      if (indexOfArray[i] !== -1 && from < inputPreview.length - lengthArray[i]) {
        outputSlice =
          checkToArray[i].slice(0, 2) === '--'
            ? inputPreview.slice(from - 1, indexOfArray[i]).trim()
            : inputPreview.slice(from - 1, indexOfArray[i] + lengthArray[i]).trim();
        break;
      }
    }
  } else if (sliceType === 'stringToEnd') {
    const checkFromArray = Array.isArray(from) ? from : [from];
    const mapArrayFrom = checkFromArray.map(item => (item.slice(0, 2) === '--' ? item.slice(2) : item));
    const lengthArray = mapArrayFrom.map(item => item.length);
    const indexOfArray = mapArrayFrom.map(item => inputPreview.indexOf(item));

    for (let i = 0; i < indexOfArray.length; i++) {
      if (indexOfArray[i] !== -1) {
        outputSlice =
          checkFromArray[i].slice(0, 2) === '--'
            ? inputPreview.slice(indexOfArray[i] + lengthArray[i], inputPreview.length + 1).trim()
            : inputPreview.slice(indexOfArray[i], inputPreview.length + 1).trim();
        break;
      }
    }
  }
  return outputSlice;
};

export const formatValueAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, formatValueAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, formatValueAction);
    }
  }
  let unit, value, output;
  unit = inputPreview.match(/[A-z]+?/g)?.join('') || '';
  value = inputPreview.replace(/[\,A-z]+?/g, '').trim();
  if (actionValue.formatType === 'keepDecimal') {
    value = parseFloat(value);
    if (!isNaN(value)) {
      if (actionValue.round === 'fixed' && actionValue.length) value = value.toFixed(parseInt(actionValue.length));
      else value = parseFloat(value.toFixed(parseInt(actionValue.length)));
    }
  } else value = parseInt(value);
  output = Functions.formatNumberWithComma(value) + ' ' + unit;
  return output;
};

export const splitAction = (inputPreview, actionValue) => {
  if (Array.isArray(inputPreview)) {
    return Functions.handleArrayInput(inputPreview, actionValue, null, splitAction);
  } else if (!inputStringIsProcessed) {
    inputStringIsProcessed = true;
    // use for case preview and user input an array
    const convertedInput = Functions.convertPreviewStringToArray(inputPreview);
    if (Array.isArray(convertedInput)) {
      return Functions.handleArrayInput(convertedInput, actionValue, null, splitAction);
    }
  }
  if (actionValue.split !== 'line') {
    const separator = {
      space: ' ',
      slash: '/',
      hypen: '-',
    };
    const inputSplit = inputPreview.split(separator[actionValue.split]);
    const index = parseInt(actionValue.index);
    let output = inputSplit;
    if (inputSplit.length > 1) {
      if (actionValue.type === 'remove') {
        if (index > 0) {
          output = inputSplit.splice(index, inputSplit.length);
        } else {
          output = inputSplit.splice(0, inputSplit.length + index);
        }
      } else {
        if (index > 0) {
          output = inputSplit.splice(0, index);
        } else {
          output = inputSplit.splice(inputSplit.length + index, inputSplit.length);
        }
      }
    }
    return output.join(separator[actionValue.split]);
  } else {
    let inputSplitArray = Functions.splitStringByBreakLine(inputPreview);
    const keywordArray = actionValue.keyword;
    const action = actionValue.lineAction;
    let lineIndex = parseInt(actionValue.lineIndex);
    const { lineOption } = actionValue;
    let currentLine = '';
    // Select line by line index
    if (lineOption === 'lineIndex') {
      if (lineIndex > 0) {
        currentLine = inputSplitArray[lineIndex - 1];
        if (action.includes('Only')) lineIndex -= 1;
      } else {
        lineIndex = inputSplitArray.length + lineIndex;
        currentLine = inputSplitArray[inputSplitArray.length + lineIndex];
        if (!action.includes('Only')) lineIndex += 1;
      }
    // Select line by keyword
    } else {
      if (lineIndex < 0) lineIndex = inputSplitArray.length + lineIndex;
      for (const keyword of keywordArray) {
        for (const [index, row] of inputSplitArray.entries()) {
          if (row.toUpperCase().includes(keyword.toUpperCase())) {
            action.includes('Only') ? (lineIndex = index) : (lineIndex = index + 1);
            currentLine = row;
            break;
          }
        }
        // if found the line
        if (currentLine) break;
      }
    }
    if (action === 'removeOnly') inputSplitArray.splice(lineIndex, 1);
    else if (action === 'selectOnly') inputSplitArray = inputSplitArray.splice(lineIndex, 1);
    // Case remove multiple line
    else {
      lineIndex = lineIndex > 0 ? lineIndex : inputSplitArray.length + lineIndex + 1;
      const optionParam = {
        removeMany: {
          start: [lineIndex, inputSplitArray.length],
          end: [0, lineIndex - 1],
        },
        selectMany: {
          start: [0, lineIndex],
          end: [lineIndex - 1, inputSplitArray.length],
        },
      };
      const { startEnd } = actionValue;
      const splitParams = optionParam[action][startEnd];
      inputSplitArray = inputSplitArray.splice(splitParams[0], splitParams[1]);
    }
    const output = inputSplitArray.join('\n');
    return output;
  }
};

// divideTotalAction is special action that don't use handleArrayInput function
export const divideTotalAction = (inputPreview, actionValue, extendData) => {
  const output = inputPreview;
  const outputArray = [];
  const dividend = actionValue.from ? extendData[actionValue.from.doc_fld_id] : inputPreview.mainField;
  if (!dividend || Array.isArray(dividend)) return output;
  const divisor = extendData[actionValue.divideBy.doc_fld_id];
  if (!divisor || divisor.length === 0) return output;
  const divisorArray = Functions.getValueUnitArray(divisor, 'all');

  // Length of divisorArray will be used for divide the dividend (total fields)
  const divisorValue = divisorArray.length;
  const dividendValue = dividend.replace(/[A-z]+/g, '').trim();
  const dividendUnit = dividend.replace(/[0-9]+/g, '').trim();
  const divideResidue = dividendValue % divisorValue;
  if (actionValue.type === 'onlyInt' && divideResidue > 0) {
    // If divisorValue is float, skip the logic
    if (dividendValue % 1 > 0) return output;
    let nearestDivisible = 0;
    let newDividend = dividendValue;
    while (nearestDivisible === 0) {
      const newResidue = ++newDividend % divisorValue;
      if (newResidue === 0) nearestDivisible = newDividend;
    }
    const dividedValue = nearestDivisible / divisorValue;
    for (let i = 0; i < divisorValue - 1; i++) {
      outputArray.push(dividedValue + ' ' + dividendUnit);
    }
    const finalResidue = dividendValue - dividedValue * (divisorValue - 1);
    outputArray.push(finalResidue + ' ' + dividendUnit);
  } else {
    const dividedValue = dividendValue / divisorValue;

    for (let i = 0; i < divisorValue; i++) {
      outputArray.push(dividedValue + ' ' + dividendUnit);
    }
  }
  const outputProp = actionValue.to ? actionValue.to.doc_fld_id : 'mainField';
  output[outputProp] = outputArray;
  return output;
};
