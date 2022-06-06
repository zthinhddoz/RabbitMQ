/* eslint-disable no-restricted-syntax */
/* eslint-disable array-callback-return */
/* eslint-disable operator-linebreak */
/* eslint-disable no-plusplus */
/* eslint-disable arrow-parens */
const ACTION_TYPES = {
  SELECT: 'S',
  DELETE: 'D',
  SELECT_THEN_DELETE: 'SD',
};

export const doActions = (action, matchWords, input, regexString) => {
  let outputData = [];
  let modifiedInput = input;
  switch (action) {
    case ACTION_TYPES.SELECT:
      outputData = matchWords;
      break;
    case ACTION_TYPES.DELETE:
      modifiedInput = input.replace(regexString, match => '~'.repeat(match.length));
      break;
    case ACTION_TYPES.SELECT_THEN_DELETE:
      outputData = matchWords;
      modifiedInput = input.replace(regexString, match => '~'.repeat(match.length));
      break;
    default:
      break;
  }
  return { modifiedInput, outputData };
};

export const getParamFromRegex = regex => {
  const matchParamsRegex = '\\{{[\\w!@#$%^&*!-=+,.//]*\\}}';
  const regexParam = new RegExp(matchParamsRegex, 'g');
  const matchValue = regex.match(regexParam);
  const replaceValue = matchValue ? matchValue.map(item => item.replace(/[\{\}]/g, '')) : [];
  return [...new Set(replaceValue)];
};

export const getMatchIndexes = (matchWords, input) => {
  let newInput = `${input}`;
  const indexMatch = [];
  matchWords.forEach(word => {
    const index = newInput.indexOf(word);
    newInput = newInput.replace(word, match => '~'.repeat(match.length));
    indexMatch.push(index);
  });
  return indexMatch;
};

/* Handle for case the input data is missing at some row
  (each row length is not same). Then we reorder and fill missing place
  base on the indexDataSet to ensure the correctness of output data
  EX:
    INPUT:
      KKFU1726552
      NYKU8369695 40GP 4088.590 KG 54.030 M3
      SEGU5944168 CNAT22507 40GP 9887.950 KG 55.880 M3
      TCLU8866047 CNAT28457  7755.880 KG 64.330 M3 1059 PKG
      TCLU9337372 CNAT29734 40HC 8819.500 KG 69.267 M3 569 PKG

    OUTPUT:
      AS-IS:
        "DOC_FLD_62": ["KKFU1726552","NYKU8369695","SEGU5944168","TCLU8866047","TCLU9337372"],
        "DOC_FLD_64": ["40GP", "40GP", "40HC"],
        "DOC_FLD_66": ["1059 PKG", "569 PKG"],
        "DOC_FLD_67": ["4088.590 KG", "9887.950 KG", "7755.880 KG", "8819.500 KG"],
        "DOC_FLD_69": ["54.030 M3", "55.880 M3", "64.330 M3", "69.267 M3"],
        "DOC_FLD_63": ["CNAT22507", "CNAT28457", "CNAT29734"]
      TO-BE:
        "DOC_FLD_62": ["KKFU1726552","NYKU8369695","SEGU5944168","TCLU8866047","TCLU9337372"],
        "DOC_FLD_64": ["", "40GP", "40GP", "", "40HC"],
        "DOC_FLD_66": ["", "", "", "1059 PKG", "569 PKG"],
        "DOC_FLD_67": ["", "4088.590 KG", "9887.950 KG", "7755.880 KG", "8819.500 KG"],
        "DOC_FLD_69": ["", "54.030 M3", "55.880 M3", "64.330 M3", "69.267 M3"],
        "DOC_FLD_63": ["", "", "CNAT22507", "CNAT28457", "CNAT29734"]
  */
export const handleEmpty = (contentDataSet, indexDataSet) => {
  const orderIndexObject = Object.keys(contentDataSet).reduce((obj, key) => ({ ...obj, [key]: indexDataSet[key] }), {});
  const indexMatrix = Object.values(orderIndexObject);
  const contentMatrix = Object.values(contentDataSet);
  const maxRows = Math.max(...indexMatrix.map(item => item.length));
  const firstFieldIsStart = !indexMatrix.slice(1).some(item => item?.length && item[0] <= indexMatrix[0][0]);

  if (!firstFieldIsStart) return contentDataSet;
  
  for (let row = 0; row < maxRows; row++) {
    // Compare the value with the biggest on row
    const allRowValue = indexMatrix.map((item, idx) => ({
      index: idx,
      data: typeof item[row] === 'number' ? item[row] : -1,
    }));

    allRowValue.sort((a, b) => (a.data !== -1 ? a.data - b.data : -1));
    const rootMinValue = allRowValue.find(item => item.data !== -1).data;

    for (const column of allRowValue) {
      if (column.data === -1) {
        indexMatrix[column.index][row] = -1;
        contentMatrix[column.index][row] = '';
        continue;
      }

      const toMinDistance = Math.abs(rootMinValue - column.data);
      // Check if any value is placing at wrong index. Ex: [2,1,3] => return true
      const containInVertical = indexMatrix.some(ver => 
        ver.some(item => {
          const isBetween =
            Math.abs(rootMinValue - item) < toMinDistance && Math.abs(column.data - item) < toMinDistance;
          return isBetween;
        })
      );

      // If current index is placing at wrong position, push it down one index
      if (containInVertical) {
        indexMatrix[column.index] = [
          ...indexMatrix[column.index].slice(0, row),
          -1,
          ...indexMatrix[column.index].slice(row),
        ];
        contentMatrix[column.index] = [
          ...contentMatrix[column.index].slice(0, row),
          '',
          ...contentMatrix[column.index].slice(row),
        ];
      } else {
        // Update current index = -1
        indexMatrix[column.index][row] = -1;
      }
    }
  }

  return Object.keys(contentDataSet).reduce(
    (obj, key, index) => ({
      ...obj,
      [key]: contentMatrix[index],
    }),
    {},
  );
};

export const modifyOutputData = (docData, fieldDataOutput, originData, key) => {
  const newDocData = { ...docData };
  // If field has no value before -> append new data to it
  if (!originData) {
    newDocData[key] = fieldDataOutput;
  } else {
    // If field is array and has no value before -> append new data to it
    const fieldArrayHasNoData = Array.isArray(originData) && !originData.join('').length;
    if (fieldArrayHasNoData) newDocData[key] = fieldDataOutput;
    // If field is text with length = 0 -> append new data to it
    const fieldTextHasNodata = !Array.isArray(originData) && !originData.length;
    if (fieldTextHasNodata) newDocData[key] = Array.isArray(fieldDataOutput) ? fieldDataOutput.join(' ') : fieldDataOutput;
  }
  return newDocData;
};
