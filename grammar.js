// helpers
const letter = /[a-zA-Z]/;
const  octal_digit = /[0-7]/;
const digit = /[0-9]/;
const  hex_digit = /[0-9A-F]/;

// int_literal = digit {digit} | 
//               octal_digit {octal_digit} ("B" | "C") | 
//               digit {hex_digit} "H"
const int_literal = choice(
  seq(digit, repeat(digit)), // decimal number
  seq(octal_digit, repeat(octal_digit), choice("B", "C")), // octal number
  seq(digit, repeat(hex_digit), 'H') // hexadecimal number
);

// ident = letter {letter | digit}
const identifier = seq(letter, repeat(choice(letter, digit)));

module.exports = grammar({
  name: "modula2_pim_4",

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
    //             | type_declaration
    //             | var_declaration
    //             | procedure_declaration
    //             | module_declaration
    declaration: $ => $.const_declaration,

    // const_declaration = "CONST" {constant_declaration}
    const_declaration: $ => seq(
      $.kConst,
      repeat($.constant_declaration)
    ),

    // constant_declaration = ident "=" const_expression ";"
    constant_declaration: $ => seq(
      field("const_id", $.ident), "=", $.const_expression, ";"
    ),

    // const_expression = expression
    const_expression: $ => $.expression,

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
    factor: $ => $.number,

    // number = integer | real
    number: $ => $.integer,

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

    // keywords
    kEnd: $ => "END",

    kFrom: $ => "FROM",

    kBegin: $ => "BEGIN",
    kConst: $ => "CONST",

    kImport: $ => "IMPORT",
    kModule: $ => "MODULE",

    kDefinition: $ => "DEFINITION",

    kImplementation: $ => "IMPLEMENTATION",

    ident: $ => token(identifier),
    integer: $ => token(int_literal)
  }
});
