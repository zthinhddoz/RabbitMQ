const AppConstants = {
  WIDTH_ANNOTATION: 1600,
  HEIGHT_ANNOTATION: 2200,
  WIDTH_EXTRACTION: 595,
  HEIGHT_EXTRACTION: 842,
  TEMPLATE: {
    STATUS: {
      ANNOTATED: '3',
      NEW: '2',
      ANNOTATING: '1',
    },
    SHARE_FLG: {
      YES: 'Y',
      NO: 'N',
    },
    GROUP: {
      DEFAULT: '2',
    },
  },
  SCOPES: ['https://www.googleapis.com/auth/drive.readonly'],
  EXCLUDE_MIMETYPE: ['application/vnd.google-apps.folder'],
  // mimeType list reference: https://github.com/google/google-drive-proxy/blob/master/DriveProxy/API/MimeType.cs
  INCLUDE_TYPE_MIMETYPE_MAPPING : {
    '.pdf': 'application/pdf',
    '.txt': 'plain/text',
    '.xls': 'application/vnd.ms-excel', // file excel
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
    '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    '.ods': 'application/oleobject', // -------------
    '.doc': 'application/msword', // file word
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.odt': 'application/vnd.oasis.opendocument.text', //----------
    '.png': 'image/png', // File image
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/pjpeg',
    '.pjpeg': '',
    '.pjp': '', //-----------
  },
  LOCATION_DOC_FILE: './file',
  LOCATION_GDRIVE_KEY: './googleDriveKeys',
  FILE_TYPE_DOC_UPLOAD: ['.pdf', '.cvp', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'],
  FILE_TYPE_DOC_IMG: ['png', 'jpg', 'jpeg', 'bmp'],
  FILE_TYPE_DOC_EXCEL: ['xls', 'xlsx'],
  FILE_TYPE_JSON_UPLOAD: '.json',
  DOC_FILE_TYPE: {
    IMAGE: 'img',
    PDF: 'pdf',
    EXCEL_XLS: 'xls',
    EXCEL_XLSX: 'xlsx',
  },
  TRANSACTION: {
    VERIFY: 'VERIFY',
    RE_APPLY_BIZ: 'RE_APPLY_BIZ',
    ANNOTATE: 'ANNOTATE',
  },
  MONTH_IN_YEAR: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  EXTRACTION_TYPE: {
    TICK: 'TICK',
    FIX_HEIGHT: 'FIX-HEIGHT',
    HEADER_FOOTER_REMOVAL: 'HEADER-FOOTER-REMOVAL',
    EMPTY: 'EMPTY',
  },
  DOC_STATUS: {
    NEED_ANNOTATE: 'A',
    EXTRACTED: 'E',
    FAILED: 'F',
    NEED_MATCHING: 'N',
    VERIFY: 'V',
    IN_PROCESSING: 'P',
  },
  DOC_ISSUES_CODE: {
    PE: 'PE',
    BF: 'BF',
    PB: 'PB',
    MF: 'MF',
    EF: 'EF',
    DB: 'DB',
    SYS: 'SYS',
  },
  DISPLAY_TYPE: {
    TABLE: 'T',
    ROW: 'R',
  },
  CORE_API: {
    MATCHING: '/api/v1/matching/submit',
    SUBMIT_TEMPLATE: '/api/v1/template/detect_key',
    SUBMIT_TEMPLATE_EXCEL: '/api/v1/template/detect_key_excel',
    EXTRACTION: '/api/v1/extract/submit',
    GENERATE_FORMAT: '/api/v1/matching/generate_format',
    OCR_TEXT: '/api/v1/ocr/text',
    EXCEL_INFO: '/api/v1/template/excel-info',
    RUN_PRE_PROCESS: '/api/v1/pre-process/pdf-url',
  },
  BP_API: {
    USR_INFO: '/api/shine/getUserInfo',
    BTN_AUTH: '/api/shine/get-btn-auth',
    MENU_AUTH: '/api/shine/get-menu-auth',
    ALL_COM: '/public-api/get-menu-definer',
    LOGIN: '/api/login',
    SYNC_DATA: '/public-api/get-data-synchronize',
    SAVE_SYNCHRONIZE_DATA: '/bp-api/save-synchronize-data',
  },
  CLIENT_URL: {
    VIEW_EXT: '/info-extracted',
    ANNOTATE: '/extract/annotation',
  },
  THIRD_PARTY_DATA: {
    GET_CODE_FROM_DB: '/third-party-data/get-code-by-data',
  },
  CORE_SYS_NAME: {
    MAIN: 'main',
    LABEL: 'label',
  },
  TEMPLATE_STATUSES: {
    ANNOTATED: 'Annotated',
    NOT_ANNOTATE: 'Not Annotate',
    ANNOTATING: 'Annotating',
  },
  BP_ACTION: {
    INSERT: 'I',
    UPDATE: 'U',
    DELETE: 'D',
  },
  BP_TYPE_CHANGE: {
    MENU: 'MNU',
    ROLE: 'ROLE',
    USR: 'USR',
    AUTH: 'AUTH',
  },
  EMAIL_ATTACHMENT: {
    EMAIL_ADDRESS: 'dev.shineplatform.cyberlogitec@gmail.com',
    EMAIL_PASSWORD: 'Shine123@',
    EMAIL_PASSCODE: 'ocdppmgddsvjvpzu',
    MAILBOX: 'inbox',
  },
  BP_ACTION: {
    INSERT: 'I',
    UPDATE: 'U',
    DELETE: 'D',
  },
  BP_TYPE_CHANGE: {
    MENU: 'MNU',
    ROLE: 'ROLE',
    USR: 'USR',
    AUTH: 'AUTH',
  },
  DIFF_LIMIT_PERCENT: 70,
  VESSEL_PROFILE: 'Vessel Profile',
  // For logging
  UPLOAD_METHOD_TYPES: {
    GMAIL: '[GMAIL METHOD]',
    FTP: '[FTP METHOD]',
    SFTP: '[SFTP METHOD]',
    DRIVE: '[GOOGLE DRIVE METHOD]'
  }
};

export default AppConstants;
