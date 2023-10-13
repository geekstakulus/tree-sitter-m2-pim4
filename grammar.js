const letter = /[a-zA-Z]/;
const digit = /[0-9]/;
// ident = letter {letter | digit}
const identifier = seq(letter, repeat(choice(letter, digit)));

module.exports = grammar({
  name: "modula2_pim_4",

  extras: $ => [/\s/], // ignore whitespace

  word: $ => $.ident,

  rules: {

    // compilation_unit = definition_module
    //                  | ["IMPLEMENTATION"] program_module .
    compilation_unit: $ => choice(
      $.definition_module,
      seq(
        optional($.kImplementation),
        $.program_module
      )
    ),

    // definition_module = "DEFINITION" "MODULE" ident ";"
    //                     {import}
    //                     {definition}
    //                     "END" ident "."
    definition_module: $ => seq(
      $.kDefinition,
      $.module_header,
      repeat($.import),
      $.module_footer
    ),

    // program_module = "MODULE" ident [priority] ";"
    //          {import}
    //          block
    //          ident "."
    program_module: $ => seq(
      $.module_header,
      $.module_footer
    ),

    // "MODULE" ident
    module_header: $ => seq($.kModule, field("modulename", $.ident), ';'),
    
    // "END" ident
    module_footer: $ => seq($.kEnd, field("modulename", $.ident), '.'),

    import: $ => seq(
      $.kImport,
      $.ident_list,
      ";"
    ),

    ident_list: $ => $.ident,

    // keywords
    kEnd: $ => "END",

    kImport: $ => "IMPORT",
    kModule: $ => "MODULE",

    kDefinition: $ => "DEFINITION",
    kImplementation: $ => "IMPLEMENTATION",

    ident: $ => token(identifier)
  }
});
