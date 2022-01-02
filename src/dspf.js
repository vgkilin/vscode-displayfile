
module.exports = class DisplayFile { 
  constructor() {
    /** @type {RecordInfo[]} */
    this.formats = [];
    
    /** @type {FieldInfo} */
    this.currentField = null;
    
    /** @type {FieldInfo[]} */
    this.currentFields = null;
    
    /** @type {RecordInfo} */
    this.currentRecord = new RecordInfo(`GLOBAL`);
  }
  
  /**
  * @param {string[]} lines 
  */
  parse(lines) {
    let textCounter = 0;
    
    let name, len, type, dec, inout, x, y, keywords;
    
    lines.forEach(line => {
      line = line.padEnd(80);
      
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
        if (this.currentField !== null) this.currentFields.push(this.currentField);
        if (this.currentFields !== null) this.currentRecord.fields = this.currentFields;
        if (this.currentRecord !== null) this.formats.push(this.currentRecord);
        
        this.currentRecord = new RecordInfo(name);
        this.currentFields = [];
        this.currentField = null;
        
        this.HandleKeywords(keywords);
        break;
        
      case ' ':
        if ((x !== "" && y !== "") || inout === "H") {
          if (this.currentField !== null)
            this.currentFields.push(this.currentField);
          
          if (inout === "H")
          {
            x = "0"; 
            y = "0";
          }
          
          this.currentField = new FieldInfo();
          this.currentField.position = {
            x: Number(x),
            y: Number(y)
          };
        }
        
        if (name != "")
        {
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
            this.currentField.type = `decimal`;
            if (dec != "") this.currentField.decimals = Number(dec);
            break;
          default:
            this.currentField.type = `char`;
            break;
          }
          this.HandleKeywords(keywords);
        }
        else
        {
          this.HandleKeywords(keywords);
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
        }
        break;
      }
    });
    
    if (this.currentField !== null) this.currentFields.push(this.currentField);
    if (this.currentFields !== null) this.currentRecord.fields = this.currentFields;
    if (this.currentRecord !== null) this.formats.push(this.currentRecord);
  }
  
  /**
  * @param {string} keywords 
  * @returns 
  */
  HandleKeywords(keywords) {
    if (keywords.endsWith("'") && keywords.endsWith("'"))
    {
      this.currentField.value = keywords.substring(1, keywords.length - 1);
      return;
    }
    if (keywords.includes("(") && keywords.includes(")")) {
      let midIndex = keywords.indexOf('(');
      let option = keywords.substring(0, midIndex).toUpperCase();
      let value = keywords.substring(midIndex + 1);
      value = value.substring(0, value.length - 1);
      
      if (this.currentField === null) {
        switch (option.toUpperCase())
        {
        case "WINDOW":
          this.currentRecord.isWindow = true;
          let points = value.split(' ');
          //WINDOW (STARTY STARTX SIZEY SIZEX)
          this.currentRecord.windowSize = {
            width: Number(points[3]),
            height: Number(points[2])
          };
          break;

        default:
          this.currentRecord.keywords[option.toUpperCase()] = value;
          break;
        }

      } else {
        this.currentField.keywords[option.toUpperCase()] = value;
      }
    }
  }
}

class RecordInfo {
  constructor(name) {
    this.name = name;
    
    /** @type {FieldInfo[]} */
    this.fields = [];
    
    this.isWindow = false;
    this.windowSize = {
      width: 80,
      height: 24
    };

    /** @type {{[name: string]: string}} */
    this.keywords = {};
  }
}

class FieldInfo {
  constructor(name) {
    this.name = name;
    this.value = null;
    
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

    /** @type {{[name: string]: string}} */
    this.keywords = {};
  }
}