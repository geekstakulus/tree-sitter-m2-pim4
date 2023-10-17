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

    // const_expression = simple_const_expr [relation simple_const_expr]
    const_expression: $ => $.simple_const_expr,

    // simple_const_expr = ["+" | "-"] const_term {add_operator const_term}
    simple_const_expr: $ => $.const_term,

    // const_term = const_factor {mult_operator const_factor}
    const_term: $ => $.const_factor,

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
      $.set_expression
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
        seq("..", field("rhs", $.const_expression))
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

    // keywords
    kEnd: $ => "END",

    kFrom: $ => "FROM",

    kBegin: $ => "BEGIN",
    kConst: $ => "CONST",

    kImport: $ => "IMPORT",
    kModule: $ => "MODULE",

    kDefinition: $ => "DEFINITION",

    kImplementation: $ => "IMPLEMENTATION",

    string: $ => token(string_literal),
    ident: $ => token(identifier),
    integer: $ => token(int_literal),
    real: $ => token(real_literal)
  }
});
