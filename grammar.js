// helpers
const letter = /[a-zA-Z]/;
const  octal_digit = /[0-7]/;
const digit = /[0-9]/;
const  hex_digit = /[0-9A-F]/;

// string = "'" {character} "'" | digit {hex_digit} "X"
const string_literal = choice(
  /"[^"\n]*"/, // double quoted string
  /'[^'\n]*'/ // single quoted string
);

// int_literal = digit {digit} | 
//               octal_digit {octal_digit} ("B" | "C") | 
//               digit {hex_digit} "H"
const int_literal = choice(
  seq(digit, repeat(digit)), // decimal number
  seq(octal_digit, repeat(octal_digit), choice("B", "C")), // octal number
  seq(digit, repeat(hex_digit), 'D'), // double integer number supported by some compilers
  seq(digit, repeat(hex_digit), 'H') // hexadecimal number
);

// scale_factor = "E" ["+" | "-"] digit {digit}
const scale_factor = seq('E', optional(choice('+', '-')), digit, repeat(digit));

// real_literal = digit {digit} "." {digit} [scale_factor]
const real_literal = seq(
  digit, repeat(digit), '.', 
  repeat(digit), optional(scale_factor)
);

// ident = letter {letter | digit}
const identifier = seq(letter, repeat(choice(letter, digit)));

module.exports = grammar({
  name: "m2pim4",

  extras: $ => [/\s/], // ignore whitespace

  word: $ => $.ident,

  rules: {

    // compilation_unit = definition_module
    //                  | program_module .
    compilation_unit: $ => choice(
      $.definition_module,
      $.program_module
    ),

    // definition_module = definition_module_header
    //                     {import}
    //                     {definition}
    //                     "END" module_footer
    definition_module: $ => seq(
      $.definition_module_header,
      repeat($.import),
      $.kEnd,
      $.module_footer
    ),

    // program_module = program_module_header
    //          {import}
    //          block
    //          module_footer
    program_module: $ => seq(
      $.program_module_header,
      repeat($.import),
      $.block,
      $.module_footer
    ),

    // "DEFINITION" "MODULE" ident [priority]
    definition_module_header: $ => seq($.kDefinition, $.kModule, field("modulename", $.ident), ';'),

    // ["IMPLEMENTATION"] "MODULE" ident [priority]
    program_module_header: $ => seq(
      optional($.kImplementation), 
      $.kModule, 
      field("modulename", $.ident), ';'
    ),
    
    // ident "."
    module_footer: $ => seq(field("modulename", $.ident), '.'),

    // Instead of the production as defined in the book,
    // I have decided to split into two productions
    // qualified import and unqualified import
    // import = qualified_import 
    //        | unqualified_import .
    import: $ => choice(
      $.qualified_import,
      $.unqualified_import
    ),

    // unqualified_import = "FROM" ident "IMPORT" ident_list ";"
    // ident is the name of the module an ident_list is 
    // the list of identifiers imported from the specific module
    unqualified_import: $ => seq(
      $.kFrom,
      field("impmodule", $.ident),
      $.kImport,
      field("idlist", $.ident_list),
      ";"
    ),

    // qualified_import = "IMPORT" ident_list ";"
    // ident_list = list of module names
    qualified_import: $ => seq(
      $.kImport,
      field("impmodules", $.ident_list),
      ";"
    ),

    // block = {declaration}
    //         [block_body]
    //         "END"
    block: $ => seq(
      repeat($.declaration),
      optional($.block_body),
      $.kEnd
    ),

    // block_body = "BEGIN" statement_seq
    block_body: $ => seq(
      $.kBegin
    ),

    // declaration = const_declaration
    //             | type_decl
    //             | var_declaration
    //             | procedure_declaration
    //             | module_declaration
    declaration: $ => choice(
      $.const_declaration,
      $.type_decl
    ),

    // const_declaration = "CONST" {constant_declaration}
    const_declaration: $ => seq(
      $.kConst,
      repeat($.constant_declaration)
    ),

    // constant_declaration = ident "=" const_expression ";"
    constant_declaration: $ => seq(
      field("const_id", $.ident), "=", $.const_expression, ";"
    ),

    // const_expression = simple_const_expr [relation simple_const_expr]
    const_expression: $ => seq(
      $.simple_const_expr,
      optional(
        seq($.relation, $.simple_const_expr)
      )
    ),

    // relation = "=" | "#" | "<>" | "<" | "<=" | ">" | ">=" | "IN"
    relation: $ => choice(
      $.opEqual,
      $.opNotEqual,
      $.opLessThan,
      $.opLessOrEqual,
      $.opGreaterThan,
      $.opGreaterOrEqual,
      $.kIn
    ),

    // simple_const_expr = ["+" | "-"] const_term {add_operator const_term}
    simple_const_expr: $ => seq(
      optional(
        choice($.opPlus, $.opMinus)
      ),
      $.const_term,
      repeat(
        seq(
          $.add_operator,
          $.const_term
        )
      )
    ),

    // add_operator = "+" | "-" | "OR"
    add_operator: $ => choice(
      $.opPlus,
      $.opMinus,
      $.kOr
    ),

    // const_term = const_factor {mult_operator const_factor}
    const_term: $ => seq(
      $.const_factor,
      repeat(
        seq(
          $.mult_operator,
          $.const_factor
        )
      )
    ),

    // mult_operator = "*" | "/" | "DIV" | "MOD" | "AND" | "&" .
    mult_operator: $ => choice(
      $.opTimes,
      $.opDivide,
      $.kDiv,
      $.kMod,
      $.kAnd,
      $.opAnd
    ),

    // const_factor = qualident | 
    //                number | 
    //                string | 
    //                set | 
    //                "(" const_expression ")" | 
    //                "NOT" const_factor
    const_factor: $ => choice(
      $.qualident,
      $.number,
      $.string,
      $.set_expression,
      seq("(", field("paren_expr", $.const_expression), ")"),
      seq($.kNot, $.const_factor)
    ),

    // type_decl = "TYPE" {type_declaration}
    type_decl: $ => seq($.kType, repeat($.type_declaration)),

    // type_declaration = ident "=" type .
    type_declaration: $ => seq($.ident, "=", $.type, ";"),

    // type = simple_type
    //      | array_type
    //      | record_type
    //      | set_type
    //      | pointer_type
    //      | procedure_type
    type: $ => choice(
      $.simple_type,
      $.array_type,
      $.record_type,
      $.set_type,
      $.pointer_type,
      $.procedure_type
    ),

    // simple_type = qualident | enumeration | subrange_type
    simple_type: $ => choice(
      $.qualident,
      $.enumeration,
      $.subrange_type
    ),

    // enumeration = "(" ident_list ")"
    enumeration: $ => seq(
      "(",
      $.ident_list,
      ")"
    ),

    // ident_list = ident {"," ident}
    ident_list: $ => seq(
      $.ident, 
      repeat(",", $.ident)
    ),

    // subrange_type = "[" const_expression ".." const_expression "]"
    subrange_type: $ => seq(
      "[",
      field("from", $.const_expression),
      $.opRange,
      field("to", $.const_expression),
      "]"
    ),

    // array_type = "ARRAY" simple_type "OF" type .
    array_type: $ => seq(
      $.kArray,
      $.simple_type,
      $.kOf,
      $.type
    ),

    // record_type = "RECORD" [field_list] {"," field_list} "END"
    record_type: $ => seq(
      $.kRecord, 
      seq(
        optional($.field_list), 
        repeat(seq(";", $.field_list)),
        optional(";")
      ),
      $.kEnd
    ),

    // field_list = basic_field_list | variant_field_list
    field_list: $ => choice(
      $.basic_field_list,
      $.variant_field_list
    ),

    // basic_field_list = ident_list ":" type
    basic_field_list: $ => seq($.ident_list, ":", $.type),

    // variant_field_list = "CASE" [ident] ":" qualident "OF" variant {"|" variant}
    //                      ["ELSE" [field_list] {"," field_list}] "END"
    variant_field_list: $ => seq(
      $.kCase,
      optional($.ident),
      ":",
      $.qualident,
      $.kOf,
      $.variant,
      repeat(seq("|", $.variant)),
      optional(
        seq(
          $.kElse,
          optional($.field_list),
          repeat(seq(";", $.field_list)),
          optional(";")
        )
      ),
      $.kEnd
    ),

    // variant = case_label_list ":" [field_list] {";" field_list}
    variant: $ => seq(
      $.case_label_list, 
      ":", 
      seq(
        optional($.field_list),
        repeat(seq(";", $.field_list)),
        optional(";")
      )
    ),

    // case_label_list = case_labels {"," case_labels}
    case_label_list: $ => seq(
      $.case_labels,
      repeat(seq(",", $.case_labels))
    ),

    // case_labels = const_expression [".." const_expression]
    case_labels: $ => seq(
      $.const_expression,
      optional(seq("..", $.const_expression))
    ),

    // set_type = "SET" "OF" simple_type
    set_type: $ => seq($.kSet, $.kOf, $.simple_type),

    // pointer_type = "POINTER" "TO" type
    pointer_type: $ => seq($.kPointer, $.kTo, $.type),
    
    // pointer_type = "PROCEDURE" [formal_type_list]
    procedure_type: $ => seq($.kProcedure, optional($.formal_type_list)),

    // formal_type_list = "(" [formal_type_param {"," formal_type_param] ")" [":" qualident]
    formal_type_list: $ => seq(
      "(",
      optional(
        seq(
          $.formal_type_param, 
          repeat(seq(",", $.formal_type_param))
        )
      ),
      ")",
      optional($.proc_return_type)
    ),

    // formal_type_param = ["VAR"] formal_type
    formal_type_param: $ => seq(optional($.kVar), $.formal_type),

    // proc_return_type = ":" qualident
    proc_return_type: $ => seq(":", $.qualident),

    // formal_type = ["ARRAY" "OF"] qualident
    formal_type: $ => seq(
      optional(
        seq($.kArray, $.kOf)
      ),
      $.qualident
    ),

    // expression = simple_expresion [relation simple_expression]
    expression: $ => $.simple_expression,

    // simple_expression = ["+" | "-"] term {add_operator term}
    simple_expression: $ => $.term,

    // term = factor {mul_operator factor}
    term: $ => $.factor,

    // factor = number | 
    //          string | 
    //          set | 
    //          designator [actual_parameters] |
    //          "(" expression ")" |
    //          "NOT" factor
    factor: $ => choice(
      $.number,
      $.string,
      $.set_expression,
      seq(
        $.designator
      ),
    ),

    // number = integer | real
    number: $ => choice(
      $.integer,
      $.real
    ),

    // set_expression = [qualident] "{" [element_list] "}" .
    set_expression: $ => seq(
      optional($.qualident),
      "{",
      optional($.element_list),
      "}"
    ),

    // element_list = element {"," element}
    element_list: $ => seq(
      $.element,
      repeat(
        seq(",", $.element)
      )
    ),

    // element = const_expression [".." const_expression]
    element: $ => seq(
      field("lhs", $.const_expression),
      repeat(
        seq($.opRange, field("rhs", $.const_expression))
      )
    ),

    // ident_list = ident {"," ident}
    ident_list: $ => seq(
      $.ident,
      repeat(
        seq(
          ",",
          $.ident
        )
      )
    ),

    // designator = qualident {"." ident | "[" expression_list "]" "^"}
    designator: $ => $.qualident,

    // qualident = ident {"." ident}
    qualident: $ => seq(
      field("qualifier_or_id", $.ident),
      repeat(
        seq(".", field("qualified", $.ident))
      )
    ),

    // operators

    // relational
    opEqual: $ => "=",
    opNotEqual: $ => choice("#", "<>"),
    opLessThan: $ => "<",
    opLessOrEqual: $ => "<=",
    opGreaterThan: $ => ">",
    opGreaterOrEqual: $ => ">=",

    // add operators
    opPlus: $ => "+",
    opMinus: $ => "-",

    // mult operators
    opTimes: $ => "*",
    opDivide: $ => "/",
    opAnd: $ => "&",

    opRange: $ => "..",

    // keywords
    kIn: $ => "IN",
    kOf: $ => "OF",
    kOr: $ => "OR",
    kTo: $ => "TO",

    kAnd: $ => "AND",
    kDiv: $ => "DIV",
    kEnd: $ => "END",
    kMod: $ => "MOD",
    kNot: $ => "NOT",
    kSet: $ => "SET",
    kVar: $ => "VAR",

    kCase: $ => "CASE",
    kElse: $ => "ELSE",
    kFrom: $ => "FROM",
    kType: $ => "TYPE",

    kArray: $ => "ARRAY",
    kBegin: $ => "BEGIN",
    kConst: $ => "CONST",

    kImport: $ => "IMPORT",
    kModule: $ => "MODULE",
    kRecord: $ => "RECORD",

    kPointer: $ => "POINTER",

    kProcedure: $ => "PROCEDURE",

    kDefinition: $ => "DEFINITION",

    kImplementation: $ => "IMPLEMENTATION",

    // literals
    string: $ => token(string_literal),
    ident: $ => token(identifier),
    integer: $ => token(int_literal),
    real: $ => token(real_literal)
  }
});
