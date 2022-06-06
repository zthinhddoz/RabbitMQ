import logger from '~/shared/logger';

export default class ExtractionLogicServices {
  constructor() {}

  static mergeRowForWeightMeasurement(data, listFld) {
    try {
      for (const fldId in data) {
        if (data[fldId].dp_tp === 'T' && listFld.includes(fldId)) {
          const stringVal = data[fldId].text;
          const found = stringVal.match(/\b[0-9.,]+\n\W{0,2}\s?[A-z]+['|\(]?(ES|S)?[\)]?\b/g);
          if (found && data[fldId].sentence.length > 1) {
            const oldSentence = data[fldId].sentence;
            const newSentence = [];
            for (let i = 0; i < oldSentence.length - 1; i += 2) {
              const item = oldSentence[i];
              const itemUnit = oldSentence[i + 1];
              item.content = `${item.content} ${itemUnit.content}`;
              item.y2 = itemUnit.y2;
              newSentence.push(item);
            }
            data[fldId].sentence = newSentence;
          }
        }
      }
      return data;
    } catch (error) {
      logger.error(error);
      return data;
    }
  }

  static getContainerNo(result, containerNoFldId) {
    try {
      for (const fldId in result) {
        if (fldId === containerNoFldId) {
          const fldData = result[fldId].data;
          if (Array.isArray(fldData) && fldData.length > 0) {
            for (let index = 0; index < fldData.length; index++) {
              const stringVal = fldData[index];
              const checkFound = stringVal.match(
                /\b[A-Z]{4}[\-\–\\\/\s\.]?\d{3}[\-\–\\\/\s\.]?\d{3}[\&]?[\-\–\\\/\s\.]?\d{1}\b/g,
              );
              if (checkFound) {
                let containerNo = '';
                checkFound.forEach(element => {
                  containerNo = `${containerNo} ${element}`;
                });
                containerNo = containerNo.trim();
                result[fldId].data[index] = containerNo;
              }
            }
          }
        }
      }
      return result;
    } catch (error) {
      logger.error(error);
      return result;
    }
  }
}
