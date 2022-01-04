
class DisplayFile { 
  constructor() {
    /** @type {RecordInfo[]} */
    this.formats = [];
    
    /** @type {FieldInfo} */
    this.currentField = null;
    
    /** @type {FieldInfo[]} */
    this.currentFields = [];
    
    /** @type {RecordInfo} */
    this.currentRecord = new RecordInfo(`GLOBAL`);
  }
  
  /**
  * @param {string[]} lines 
  */
  parse(lines) {
    let textCounter = 0;
    
    let name, len, type, dec, inout, x, y, keywords;
    
    lines.forEach((line, index) => {
      line = line.padEnd(80);

      if (line[6] === `*`) return;
      
      name = line.substring(18, 28).trim();
      len = line.substring(29, 34).trim();
      type = line[34].toUpperCase();
      dec = line.substring(35, 37).trim();
      inout = line[37].toUpperCase();
      y = line.substring(38, 41).trim();
      x = line.substring(41, 44).trim();
      keywords = line.substring(44).trim();
      
      switch (line[16]) {
      case 'R':
        if (this.currentField !== null) {
          this.currentField.handleKeywords();
          this.currentFields.push(this.currentField);
        };
        if (this.currentFields !== null) this.currentRecord.fields = this.currentFields;
        if (this.currentRecord !== null) {
          this.currentRecord.range.end = index;
          this.currentRecord.handleKeywords();
          this.formats.push(this.currentRecord);
        }
        
        this.currentRecord = new RecordInfo(name);
        this.currentRecord.range.start = index;

        this.currentFields = [];
        this.currentField = null;
        
        this.HandleKeywords(keywords);
        break;
        
      case ' ':
        if ((x !== "" && y !== "") || inout === `H`) {
          if (this.currentField !== null) {
            this.currentField.handleKeywords();
            this.currentFields.push(this.currentField);
          }
          
          this.currentField = new FieldInfo();
          this.currentField.position = {
            x: Number(x),
            y: Number(y)
          };
        }
        
        if (name != "")
        {
          if (this.currentField) {
            this.currentField.name = name;
            this.currentField.value = "";
            this.currentField.length = Number(len);
            switch (inout)
            {
            case "I":
              this.currentField.displayType = `input`;
              break;
            case "B":
              this.currentField.displayType = `both`;
              break;
            case "H":
              this.currentField.displayType = `hidden`;
              break;
            case " ":
            case "O":
              this.currentField.displayType = `output`;
              break;
            }
            
            this.currentField.decimals = 0;
            switch (type)
            {
            case "D":
            case "Z":
            case "Y":
              this.currentField.type = `decimal`;
              if (dec != "") this.currentField.decimals = Number(dec);
              break;
            case `L`: //Date
              this.currentField.length = 8;
              this.currentField.type = `char`;
              this.currentField.keywords.push({
                name: `DATE`,
                value: undefined
              });
              break;
            case `T`: //Time
              this.currentField.length = 8;
              this.currentField.type = `char`;
              this.currentField.keywords.push({
                name: `TIME`,
                value: undefined
              });
              break;
            default:
              this.currentField.type = `char`;
              break;
            }
            
            this.HandleKeywords(keywords);
          }
        }
        else
        {
          if (this.currentField != null)
          {
            if (this.currentField.name == null)
            {
              textCounter++;
              this.currentField.name = `TEXT${textCounter}`;
              if (this.currentField.value == null) this.currentField.value = "";
              this.currentField.length = this.currentField.value.length;
              this.currentField.displayType = `const`;
            }
          }
          this.HandleKeywords(keywords);
        }
        break;
      }
    });
    
    if (this.currentField !== null) {
      this.currentField.handleKeywords();
      this.currentFields.push(this.currentField);
    };
    if (this.currentFields !== null) this.currentRecord.fields = this.currentFields;
    if (this.currentRecord !== null) {
      this.currentRecord.range.end = lines.length;
      this.currentRecord.handleKeywords();
      this.formats.push(this.currentRecord);
    }

    this.currentField = null;
    this.currentFields = null;
    this.currentRecord = null;
  }
  
  /**
  * @param {string} keywords 
  * @returns 
  */
  HandleKeywords(keywords) {
    if (keywords.length === 0) return;

    if (this.currentField) {
      this.currentField.keywordStrings.push(keywords);
    } else {
      this.currentRecord.keywordStrings.push(keywords);
    }
  }

  /** @param {string[]} keywordStrings */
  static parseKeywords(keywordStrings) {
    let result = {
      value: ``,
      keywords: []
    };

    let inString = false;
    let value = ``;
  
    keywordStrings.forEach(keywordString => {
      if (keywordString.startsWith(`'`)) {
        inString = true;
        keywordString = keywordString.substring(1);
  
        if (keywordString.endsWith(`'`) || keywordString.endsWith(`-`)) {
          keywordString = keywordString.substring(0, keywordString.length - 1);
        }
  
        result.value = keywordString;
        return;
      }
  
      if (keywordString.endsWith('-')) {
        if (inString)
          result.value += keywordString.substring(0, keywordString.length - 1);
        else
          value += keywordString.substring(0, keywordString.length - 1);
      } else 
      if (keywordString.endsWith(`'`)) {
        if (inString) {
          result.value += keywordString.substring(0, keywordString.length - 1);
          inString = false; 
        }
      } else {
        value += keywordString + ` `;
      }
    });
  
    if (value.length > 0) {
      value += ` `;
        
      let inBrakcets = 0;
      let word = ``;
      let innerValue = ``;
  
      for (let i = 0; i < value.length; i++) {
        switch (value[i]) {
        case `(`:
          inBrakcets++;
          break;
        case `)`:
          inBrakcets--;
          break;
        case ` `:
          if (inBrakcets > 0) {
            innerValue += value[i];
          } else {
            if (word.length > 0) {
              result.keywords.push({
                name: word.toUpperCase(),
                value: innerValue.length > 0 ? innerValue : undefined
              });
  
              word = ``;
              innerValue = ``;
            }
          }
          break;
        default:
          if (inBrakcets > 0) 
            innerValue += value[i];
          else
            word += value[i];
          break;
        }
      }
    }
    
    return result;
  }
}

class RecordInfo {
  constructor(name) {
    this.name = name;
    
    /** @type {FieldInfo[]} */
    this.fields = [];

    this.range = {
      start: -1,
      end: -1
    };
    
    this.isWindow = false;
    /** @type {string} */
    this.windowReference = undefined;
    this.windowSize = {
      y: 0,
      x: 0,
      width: 80,
      height: 24
    };

    /** @type {string[]} */
    this.keywordStrings = [];

    /** @type {{name: string, value: string}[]} */
    this.keywords = [];
  }

  handleKeywords() {
    const data = DisplayFile.parseKeywords(this.keywordStrings);

    this.keywords.push(...data.keywords);

    this.keywords.forEach(keyword => {
      switch (keyword.name) {
      case "WINDOW":
        this.isWindow = true;
        let points = keyword.value.split(' ');

        switch (points.length) {
        case 4:
          //WINDOW (STARTY STARTX SIZEY SIZEX)
          this.windowSize = {
            y: Number(points[0]) || 2,
            x: Number(points[1]) || 2,
            width: Number(points[3]),
            height: Number(points[2]) + 1
          };
          break;
        case 1:
          //WINDOW (REF)
          this.windowReference = points[0];
          break;
        }

        break;
      }
    });
  }
}

class FieldInfo {
  constructor(name) {
    /** @type {string} */
    this.name = name;

    /** @type {string} */
    this.value = ``;
    
    /** @type {`char`|`decimal`} */
    this.type = null;
    
    /** @type {`input`|`output`|`both`|`const`|`hidden`} */
    this.displayType = null;
    
    this.length = 0;
    this.decimals = 0;
    
    this.position = {
      x: 0,
      y: 0
    };

    /** @type {string[]} */
    this.keywordStrings = [];

    /** @type {{name: string, value: string}[]} */
    this.keywords = [];
  }

  handleKeywords() {
    const data = DisplayFile.parseKeywords(this.keywordStrings);

    this.keywords.push(...data.keywords);

    if (data.value.length > 0) this.value = data.value;
  }
}

module.exports = {
  DisplayFile,
  FieldInfo,
  RecordInfo
}