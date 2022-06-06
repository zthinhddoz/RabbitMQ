import { log } from 'console';
import model from '~/shared/models';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');

// import model from '~/shared/models';

export default class ConvertCsvService {
  static PDF_SENTENCE_WIDTH_GAP = 8;
  static THRESHOLD_SPACE = 5;
  static THRESHOLD = 3;
  static BREAKLINE = '!@#$%^&';
  constructor() {
    this.status = 400;
    this.dataRes = null;
  }

  static async groupWordsToLines(wordsBox) {
    /*
  Find words have same line
  input: all words in box or page
  output: words in a line
  */
    const newWordBox = [];
    for (const word of wordsBox) {
      const element = [...word];
      element[0] = Math.floor(word[0]);
      element[1] = Math.floor(word[1]);
      element[2] = Math.floor(word[2]);
      element[3] = Math.floor(word[3]);
      newWordBox.push(element);
    }
    const linePage = [];
    const dataWords = [];
    for (const word of newWordBox) {
      const lineCheck = JSON.stringify(linePage);
      const element = JSON.stringify([word[5], word[6]]);
      if (lineCheck.indexOf(element) === -1) {
        const indexWord = [word[5], word[6]];
        linePage.push(indexWord);
      }
    }
    const wordCoor = [];
    const wordIndex = [];

    for (let i = 0; i < newWordBox.length; i++) {
      const coorCheck = JSON.stringify(wordCoor);
      const element = JSON.stringify([newWordBox[i][0], newWordBox[i][1], newWordBox[i][2], newWordBox[i][3], newWordBox[i][4]]);
      if (coorCheck.indexOf(element) === -1) {
        wordCoor.push([newWordBox[i][0], newWordBox[i][1], newWordBox[i][2], newWordBox[i][3], newWordBox[i][4]]);
        wordIndex.push(i);
      }
    }

    const myWordsNew = [];
    for (let i = 0; i < newWordBox.length; i++) {
      if (wordIndex.includes(i)) {
        myWordsNew.push(newWordBox[i]);
      }
    }
    for (let i = 0; i < linePage.length; i++) {
      const tmpLine = [];
      for (const word of myWordsNew) {
        if (word[5] === linePage[i][0] && word[6] === linePage[i][1] && word.length < 9) {
          let confdt = 100;
          if (word.length === 9) {
            confdt = word[8];
          }
          tmpLine.push({
            text: word[4],
            x1: word[0],
            y1: word[1],
            x2: word[2],
            y2: word[3],
            confdt,
          });
        }
      }
      if (tmpLine.length > 0) {
        dataWords.push(tmpLine);
      }
    }
    return dataWords;
  }
  static dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
  }
  static async createSentences(linesWords) {
    const sentenceWidthGap = this.PDF_SENTENCE_WIDTH_GAP;
    let sentences = [];
  
    for (let lineWords of linesWords) {  
        if (lineWords) {
            let sentence = lineWords[0];
            sentence["content"] = sentence.text;
            delete sentence.text;
            if (lineWords.length > 1) {
                for (let idx = 1; idx < lineWords.length; idx++) {
                    const word = lineWords[idx];
                    let sentWordSpace = Math.abs(word["x1"] - sentence["x2"]);
                    if (sentWordSpace < sentenceWidthGap) {
                      sentence["content"] += " " + word["text"];
                      sentence["x2"] = word["x2"];
                      sentence["y2"] = word["y2"];
                      if (word["confdt"] < sentence["confdt"]) {
                        sentence["confdt"] = word["confdt"];
                      }
                    } else {
                      sentences.push(sentence);
                      sentence = word;
                      sentence["content"] = sentence.text;
                      delete sentence.text;
                    }
                    
                }
            }
            sentences.push(sentence);
        }
    }
    sentences = sentences.sort(this.dynamicSort('y1'));
    let arrTemp = [];
    let arrY1 = [];
    let y1Temp = 0;
    for (let element of sentences) {
      if (Math.round(element.y1) !== y1Temp) {
        if (arrY1.length > 0) {
          arrTemp.push(arrY1);
        }
        y1Temp = Math.round(element.y1);
        arrY1 = [];
        arrY1.push(element);
      } else {
        arrY1.push(element);
      }
    }
    arrTemp.push(arrY1);
    const sentResult = [];
    for (let rowData of arrTemp) {
      rowData = rowData.sort(this.dynamicSort('x1'));
      for (const element of rowData) {
        sentResult.push(element);
      }
    }
    const finalResult = [];
    for (const element of sentResult) {
      const finalResultText = JSON.stringify(finalResult);
      const elementText = JSON.stringify(element);
      if (finalResultText.indexOf(elementText) === -1) {
        finalResult.push(element);
      }
    }
    return finalResult;
  }
  static mergeTwoItem(item1, item2) {
    try {
      const result = item1;
      result.x1 = item1.x1;
      result.y1 = Math.min(item1.y1, item2.y1);
      result.x2 = item2.x2;
      result.y2 = Math.max(item1.y2, item2.y2)
      result.content = `${item1.content} ${item2.content}`
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  static addEmptyColumnHeadLine(row1, row2) {
    try {
      const rangeCheck = [Math.round(row1[0].x1), Math.round(row2[0].x1 + 1)];
      const result = [];
      for (let i in row1) {
        const checkX1 = Math.round(row1[i].x1);
        const checkX2 = Math.round(row1[i].x2);
        if ((checkX1  >= rangeCheck[0] && checkX1 <= rangeCheck[1]) && (checkX2 >= rangeCheck[0] && checkX2 <= rangeCheck[1])) {
          const tempObj = {};
          tempObj.x1 = row1[i].x1;
          tempObj.y1 = row2[0].y1;
          tempObj.x2 = row1[i].x2;
          tempObj.y2 = row2[0].y2;
          tempObj.content = ',';
          result.push(tempObj);
        } else {
          break;
        }
      }
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  static addEmptyColumnEndLine(row1, row2) {
    try {
      const rangeCheck = [Math.round(row1[row1.length-1].x2), Math.round(row2[row2.length-1].x2) +1]
      const result = [];
      for (let i in row2) {
        const checkX1 = Math.round(row2[i].x1);
        const checkX2 = Math.round(row2[i].x2);
        if ((checkX1  >= rangeCheck[0] && checkX1 <= rangeCheck[1]) && (checkX2 >= rangeCheck[0] && checkX2 <= rangeCheck[1])) {
          const tempObj = {};
          tempObj.x1 = row2[i].x1;
          tempObj.y1 = row1[0].y1;
          tempObj.x2 = row2[i].x2;
          tempObj.y2 = row1[0].y2;
          tempObj.content = ',';
          result.push(tempObj);
        }
      }
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  static fixColumnEmpty(rowBefore, item1, item2) {
    try {
      const rangeCheck = [Math.round(item1.x2), Math.round(item2.x1)];
      const result = [];
      for (let i in rowBefore) {
        const checkX1 = rowBefore[i].x1;
        const checkX2 = rowBefore[i].x2;
        if ((checkX1  >= rangeCheck[0] && checkX1 <= rangeCheck[1]) && (checkX2 >= rangeCheck[0] && checkX2 <= rangeCheck[1])) {
          const tempObj = {};
          tempObj.x1 = rowBefore[i].x1;
          tempObj.y1 = item2.y1;
          tempObj.x2 = rowBefore[i].x2;
          tempObj.y2 = item2.y2;
          tempObj.content = ',';
          result.push(tempObj)
        }
      }
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  static async processToCsv(data) {
    try {
      let arrTemp = [];
      for (let i in data) {
        if (arrTemp.length === 0) {
          arrTemp.push(data[i]);
        } else if (data[i].content.includes('----------------------')) {
          continue;
        } else {
          if (arrTemp[arrTemp.length-1].y2 < data[i].y1 + this.THRESHOLD || arrTemp[arrTemp.length-1].y2 + this.THRESHOLD < data[i].y2) {
            arrTemp.push(this.BREAKLINE);
          }
          arrTemp.push(data[i]);
        }
      }
      arrTemp.push(this.BREAKLINE);
      let row = [];
      const outputOcr = [];
      for (let i in arrTemp) {
        if (arrTemp[i] != this.BREAKLINE) {
          if (row.length > 0 && Math.abs(arrTemp[i].x1 - row[row.length-1].x2 < this.THRESHOLD_SPACE)) {
            row[row.length-1] = this.mergeTwoItem(row[row.length-1], arrTemp[i]);
          } else {
            row.push(arrTemp[i]);
          }
        } else {
          outputOcr.push(row);
          row = [];
        }
      }
      for (let row = 1; row < outputOcr.length; row ++) {
        const fixHeader = this.addEmptyColumnHeadLine(outputOcr[row-1], outputOcr[row]);
        if (fixHeader.length > 0) {
          fixHeader.reverse();
          for (let i of fixHeader) {
            outputOcr[row].unshift(i);
          }
        }
        let newOutput = [...outputOcr[row]];
        if (outputOcr[row].length > 0) {
          for(let item = 1; item < outputOcr[row].length; item ++) {
            let fixColEmpty = this.fixColumnEmpty(outputOcr[row-1], outputOcr[row][item-1], outputOcr[row][item])
            fixColEmpty = fixColEmpty.reverse();
            if (fixColEmpty.length > 0) {
              for (let i of fixColEmpty) {
                newOutput.splice(item, 0, i);
              }
            }
          }
        }
        if (newOutput.length < 10) {
          outputOcr[row] = [...newOutput];
        }
        const fixEndRow = this.addEmptyColumnEndLine(outputOcr[row], outputOcr[row-1]);
        if (fixEndRow.length > 0) {
          for (let i of fixEndRow) {
            outputOcr[row].splice(outputOcr[row].length, 0, i);
          }
        }
      }
      let csvData = '';
      for(let row in outputOcr) {
        for(let item in outputOcr[row]) {
          if (item == 0) {
            csvData += outputOcr[row][item].content.replace(',', '');
          } else {
            if (outputOcr[row][item].content == ',') {
              csvData += outputOcr[row][item].content;
            } else {
              csvData += ',';
              csvData += outputOcr[row][item].content.replace(',','');
            }
          }
        }
        csvData = `${csvData}\n`;
      }
      return csvData;
    } catch (error) {
      console.log(error);
    }
  }

}
