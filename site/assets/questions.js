// Questions of the CoB request form. Mirrors the BPMN process "cob-intake" in outerfab/processes.
// Option: { v: value in the JSON, l: label, input: 'text'|'number'|'date'|'size'|'pair'|'file', unit, ph }
// A question is asked when its `show(a)` returns true (a = answers so far). `key` is the path in the result.
(function () {
  'use strict';
  const NS = { v: 'unspecified', l: 'Not sure' };
  const YN = [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }];
  const YNN = [...YN, NS];
  const yesish = v => v === 'yes' || v === 'unspecified';

  // ---- derived conditions (same gateways as in the BPMN) ----------------
  const c = {
    skipTech: a => a.q49 === 'complete' && a._upload && a._upload.complete === true,
    tech: a => !c.skipTech(a),
    fabDefault: a => a.q4 === 'wafer.space' || a.q4 === 'ecos',
    padGeom: a => c.tech(a) && !(c.fabDefault(a) && yesish(a.q5)),
    multi: a => c.tech(a) && (a.q32 === 'two' || a.q32 === 'more'),
    q10: a => c.tech(a) && a.q9 === 'no',
    q11: a => c.q10(a) && a.q10 === 'no',
    q12: a => c.q11(a) && a.q11 === 'no',
    q13: a => c.q12(a) && a.q12 === 'no',
    q14: a => (c.q10(a) && a.q10 === 'yes') || (c.q13(a) && a.q13 === 'yes'),
    ownBoard: a => c.tech(a) && (a.q9 === 'yes' || (c.q14(a) && a.q14 === 'no')),
  };

  const S = { start: 'Start', chip: 'Chip and pads', multi: 'Multi-die', board: 'Board', bonding: 'Bonding', order: 'Order' };

  const Q = [
    // ---- start ----------------------------------------------------------
    { id: 'q1', sec: 'start', key: 'intro.knows_cob', q: 'Do you know what chip-on-board (CoB) is?', opts: YN },
    { id: 'explain', sec: 'start', type: 'info', show: a => a.q1 === 'no', title: 'Chip-on-board in one minute',
      body: [
        'Your bare die is glued directly onto a circuit board. Thin wires connect the pads of the chip to the board, and a drop of resin or a lid protects them.',
        'There is no package in between. For small runs that is cheaper and faster than packaging, and it works for one die as well as for a hundred.',
        'The next questions tell us what your chip and your board look like. Whenever you do not know an answer, pick "Not sure". We sort that out with you later.'] },
    { id: 'q2', sec: 'start', key: 'intro.chip_designed', q: 'Is your chip designed already?',
      opts: [{ v: 'taped-out', l: 'Yes, taped out' }, { v: 'not-taped-out', l: 'Yes, not taped out yet' }, { v: 'planning', l: 'No, still planning' }] },
    { id: 'q49', sec: 'start', key: 'intro.open_cob_json', q: 'Do you already have an open.cob.json for your CoB?',
      help: 'open.cob.json is an open format that describes die, pads, wires and the board side in one file. The file is read in your browser only.',
      opts: [{ v: 'complete', l: 'Yes, complete', input: 'file', accept: '.json,application/json' },
        { v: 'incomplete', l: 'Yes, incomplete', input: 'file', accept: '.json,application/json' }, { v: 'no', l: 'No' }] },

    // ---- 1 chip and pads ------------------------------------------------
    { id: 'q3', sec: 'chip', key: 'chip.pdk', show: c.tech, q: 'Which PDK do you use?',
      opts: [{ v: 'gf180mcu', l: 'GF180MCU' }, { v: 'sky130', l: 'SKY130' }, { v: 'ihp-sg13g2', l: 'IHP SG13G2' },
        { v: 'other', l: 'Other', input: 'text', ph: 'name of the PDK' }, NS] },
    { id: 'q4', sec: 'chip', key: 'chip.manufacturer', show: c.tech, q: 'Who are you manufacturing with?',
      opts: [{ v: 'wafer.space', l: 'wafer.space' }, { v: 'ecos', l: 'ECOS' }, { v: 'other', l: 'Someone else', input: 'text', ph: 'name' }] },
    { id: 'q5', sec: 'chip', key: 'chip.default_padring', show: a => c.tech(a) && c.fabDefault(a),
      q: 'Do you follow the default chiplet padring?', opts: YNN,
      help: 'With the default padring we already know pad count, opening, pitch and rows.' },
    { id: 'q6', sec: 'chip', key: 'chip.pad_count', show: c.padGeom, skip: 'default padring', q: 'How many pads does your chiplet have?',
      opts: [{ v: 'count', l: 'Number of pads', input: 'number', ph: 'e.g. 56' }, NS] },
    { id: 'q8', sec: 'chip', key: 'chip.pad_opening', show: c.padGeom, skip: 'default padring', q: 'What is the pad opening?',
      opts: [{ v: '60x60', l: '60 × 60 µm' }, { v: '80x80', l: '80 × 80 µm' }, { v: 'other', l: 'Something else', input: 'text', ph: 'e.g. 70 × 90 µm' }, NS] },
    { id: 'q25', sec: 'chip', key: 'chip.pad_pitch_um', show: c.padGeom, skip: 'default padring', q: 'What is the pad pitch?',
      opts: [{ v: 'value', l: 'Pitch', input: 'number', unit: 'µm', ph: 'e.g. 100' }, NS] },
    { id: 'q26', sec: 'chip', key: 'chip.pad_rows', show: c.padGeom, skip: 'default padring', q: 'Are the pads in a single row or staggered?',
      opts: [{ v: 'single', l: 'Single row' }, { v: 'staggered', l: 'Staggered (two rows)' }, { v: 'core', l: 'Pads in the core area as well' }, NS] },
    { id: 'q7', sec: 'chip', key: 'chip.pads_to_connect', show: c.tech, q: 'How many pads need connection?',
      help: 'This is the number of wires.',
      opts: [{ v: 'all', l: 'All of them' }, { v: 'count', l: 'Number of pads', input: 'number', ph: 'e.g. 40' }, NS] },
    { id: 'q27', sec: 'chip', key: 'chip.pad_metal', show: c.tech, q: 'What is the top pad metal?',
      opts: [{ v: 'aluminium', l: 'Aluminium' }, { v: 'copper', l: 'Copper' }, { v: 'gold', l: 'Gold' }, { v: 'unspecified', l: 'Not sure, it is the PDK default' }] },
    { id: 'q17', sec: 'chip', key: 'chip.die_size', show: c.tech, q: 'What is your die size?',
      opts: [{ v: 'default-chiplet', l: 'Default chiplet size' }, { v: 'size', l: 'Custom size', input: 'text', unit: 'mm', ph: 'x × y, e.g. 3.9 × 5.1' }, NS] },
    { id: 'q28', sec: 'chip', key: 'chip.die_thickness', show: c.tech, q: 'How thick are your dies?',
      opts: [{ v: 'fab-default', l: 'Fab default, not thinned' }, { v: 'thinned', l: 'Thinned to', input: 'number', unit: 'µm', ph: 'e.g. 280' }, NS] },
    { id: 'q29', sec: 'chip', key: 'chip.sensitivity', show: c.tech, q: 'Is your chip sensitive to light or mechanical stress?',
      opts: [{ v: 'optical', l: 'Yes, an optical or sensor area must stay open' }, { v: 'stress', l: 'Yes, stress sensitive (analog reference, MEMS)' }, { v: 'no', l: 'No' }, NS] },
    { id: 'q18', sec: 'chip', key: 'chip.delivery_form', show: c.tech, q: 'In what form will we receive the dies?',
      opts: [{ v: 'diced', l: 'Diced single dies' }, { v: 'wafer', l: 'Full wafer or shuttle tile' }, { v: 'from-fab', l: 'Shipped directly from the fab' }, NS] },
    { id: 'q51', sec: 'chip', key: 'chip.die_packing', show: a => c.tech(a) && a.q18 === 'diced', q: 'How are the dies packed?',
      opts: [{ v: 'waffle-pack', l: 'Waffle pack' }, { v: 'gel-pack', l: 'Gel pack' }, { v: 'tape-and-reel', l: 'Tape and reel' }, NS] },
    { id: 'q32', sec: 'chip', key: 'chip.dies_per_board', show: c.tech, q: 'How many dies go on one board?',
      opts: [{ v: 'one', l: 'One' }, { v: 'two', l: 'Two' }, { v: 'more', l: 'More', input: 'number', ph: 'number of dies' }, NS] },

    // ---- 2 multi-die ------------------------------------------------------
    { id: 'q41', sec: 'multi', key: 'multi_die.die_to_die_wires', show: c.multi, q: 'Do the dies need wires directly between them?',
      opts: [{ v: 'yes', l: 'Yes, die to die' }, { v: 'no', l: 'No, each die bonds to the board only' }, NS] },
    { id: 'q42', sec: 'multi', key: 'multi_die.identical', show: c.multi, q: 'Are the dies identical?',
      opts: [{ v: 'same', l: 'Yes, same chip' }, { v: 'different-same-fab', l: 'No, different chips from the same fab' },
        { v: 'third-party', l: 'No, one is a third-party die (memory, sensor)' }, NS] },
    { id: 'q8b', sec: 'multi', key: 'multi_die.second_die_pad_opening', show: a => c.multi(a) && a.q42 === 'third-party',
      q: 'What is the pad opening of the third-party die?',
      opts: [{ v: '60x60', l: '60 × 60 µm' }, { v: '80x80', l: '80 × 80 µm' }, { v: 'other', l: 'Something else', input: 'text', ph: 'e.g. 70 × 90 µm' }, NS] },
    { id: 'q27b', sec: 'multi', key: 'multi_die.second_die_pad_metal', show: a => c.multi(a) && a.q42 === 'third-party',
      q: 'What is the top pad metal of the third-party die?',
      opts: [{ v: 'aluminium', l: 'Aluminium' }, { v: 'copper', l: 'Copper' }, { v: 'gold', l: 'Gold' }, NS] },
    { id: 'q43', sec: 'multi', key: 'multi_die.arrangement', show: c.multi, q: 'How are the dies arranged?',
      opts: [{ v: 'side-by-side', l: 'Side by side' }, { v: 'stacked', l: 'Stacked on top of each other' }, NS] },
    { id: 'q44', sec: 'multi', key: 'multi_die.gap', show: a => c.multi(a) && a.q43 !== 'stacked', q: 'What gap do you plan between the dies?',
      opts: [{ v: 'default', l: 'Default, outerfab decides' }, { v: 'value', l: 'Gap', input: 'number', unit: 'mm', ph: 'e.g. 0.5' }, NS] },
    { id: 'q45', sec: 'multi', key: 'multi_die.same_thickness', show: c.multi, q: 'Are the dies the same thickness?',
      opts: [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No', input: 'text', unit: 'µm', ph: 'e.g. 280 and 400' }, NS] },
    { id: 'q48', sec: 'multi', key: 'multi_die.backsides', show: c.multi, q: 'Do the die backsides need different potentials?',
      opts: [{ v: 'common-ground', l: 'No, common ground' }, { v: 'isolated', l: 'Yes, they must be isolated from each other' }, NS] },
    { id: 'q46', sec: 'multi', key: 'multi_die.die_to_die_wire_count', show: a => c.multi(a) && a.q41 !== 'no', q: 'How many die-to-die wires do you need?',
      opts: [{ v: 'count', l: 'Number of wires', input: 'number', ph: 'e.g. 12' }, { v: 'all-facing', l: 'All facing pads, one to one' }, NS] },
    { id: 'q47', sec: 'multi', key: 'multi_die.facing_pads_aligned', show: a => c.multi(a) && a.q41 !== 'no',
      q: 'Do the facing pads line up in the same order on both dies?',
      opts: [{ v: 'yes', l: 'Yes, one to one' }, { v: 'crossing', l: 'No, some wires cross' }, NS] },

    // ---- 3 board ----------------------------------------------------------
    { id: 'q9', sec: 'board', key: 'board.has_fabricated_pcb', show: c.tech,
      q: 'Do you already have a fabricated PCB in your office that you want to bond on?', opts: YN },
    { id: 'q10', sec: 'board', key: 'board.has_design_files', show: c.q10, q: 'Do you already have the PCB design files?', opts: YN },
    { id: 'q11', sec: 'board', key: 'board.standard_fan_out', show: c.q11, q: 'Do you want the standard wafer.space / ECOS fan-out board?', opts: YNN },
    { id: 'q12', sec: 'board', key: 'board.design_help', show: c.q12, q: 'Do you want our help designing the board?', opts: YNN },
    { id: 'q13', sec: 'board', key: 'board.files_in_advance', show: c.q13, q: 'Can you provide us with the board files in advance?', opts: YN,
      help: 'We check the bond fingers before the board is made. That is much cheaper than finding out at the bonder.' },
    { id: 'q14', sec: 'board', key: 'board.outerfab_orders_pcb', show: c.q14, q: 'Do you want us to order the PCB for the CoB?', opts: YNN,
      help: 'If we order, we choose a surface finish and bond finger rules that work.' },
    { id: 'q16', sec: 'board', key: 'board.surface_finish', show: c.ownBoard, q: 'What surface finish does your PCB have?',
      opts: [{ v: 'enig', l: 'ENIG' }, { v: 'enepig', l: 'ENEPIG' }, { v: 'hasl', l: 'HASL' }, NS] },
    { id: 'q35', sec: 'board', key: 'board.soldered_already', show: c.ownBoard, q: 'Has the board been through reflow or hand soldering already?',
      opts: [{ v: 'bare', l: 'No, bare board' }, { v: 'cleaned', l: 'Yes, cleaned afterwards' }, { v: 'not-cleaned', l: 'Yes, not cleaned' }, NS] },
    { id: 'q21', sec: 'board', key: 'board.other_components', show: c.tech, q: 'Are there other components on the board?',
      opts: [{ v: 'die-only', l: 'No, die only' }, { v: 'assembled', l: 'Yes, already assembled' }, { v: 'please-assemble', l: 'Yes, please assemble them' }, NS] },
    { id: 'q34', sec: 'board', key: 'board.connection', show: c.tech, q: 'How does the bonded board connect to your setup?',
      opts: [{ v: 'pin-headers', l: 'Pin headers' }, { v: 'edge-connector', l: 'Edge connector' }, { v: 'carrier', l: 'Castellated or soldered onto a carrier' }, NS] },

    // ---- 4 bonding and protection ---------------------------------------
    { id: 'q15', sec: 'bonding', key: 'bonding.bond_type', show: c.tech, q: 'Which bond type do you want?',
      opts: [{ v: 'al-wedge', l: 'Al wedge' }, { v: 'au-ball', l: 'Au ball' }, { v: 'unspecified', l: 'Not sure, recommend one' }] },
    { id: 'q20', sec: 'bonding', key: 'bonding.bonding_diagram', show: c.tech, q: 'Do you have a bonding diagram?',
      opts: [{ v: 'yes', l: 'Yes', input: 'file', note: 'Only the file name is noted here. Please send the file together with the result.' },
        { v: 'default-fan-out', l: 'No, same as the default fan-out' }, { v: 'create-from-pad-list', l: 'No, please create it from my pad list' }, NS] },
    { id: 'q30', sec: 'bonding', key: 'bonding.multiple_wires_per_pad', show: c.tech, q: 'Do any pads need more than one wire?',
      opts: [{ v: 'no', l: 'No' }, { v: 'power-ground', l: 'Yes, for power or ground' }, { v: 'high-current', l: 'Yes, for high current', input: 'number', unit: 'mA', ph: 'e.g. 500' }, NS] },
    { id: 'q31', sec: 'bonding', key: 'bonding.pad_to_pad_bonds', show: c.tech, q: 'Do you need bonds between two pads on the same die?', opts: YNN },
    { id: 'q33', sec: 'bonding', key: 'bonding.critical_wires', show: c.tech, q: 'Do you have signals that need short or matched wires?',
      opts: [{ v: 'no', l: 'No' }, { v: 'rf', l: 'Yes, RF or high speed' }, { v: 'analog', l: 'Yes, sensitive analog' }, NS] },
    { id: 'q19', sec: 'bonding', key: 'bonding.backside_connection', show: c.tech, q: 'Does the die backside need an electrical connection?',
      opts: [{ v: 'ground', l: 'Yes, to ground' }, { v: 'other-net', l: 'Yes, to another net', input: 'text', ph: 'net name' }, { v: 'no', l: 'No' }, NS] },
    { id: 'q22', sec: 'bonding', key: 'bonding.protection', show: c.tech, q: 'How should the die be protected?',
      opts: [{ v: 'glob-top', l: 'Glob top (black)' }, { v: 'clear', l: 'Clear encapsulation' }, { v: 'none', l: 'None, I need access for probing' }, { v: 'lid', l: 'Lid' }, NS] },
    { id: 'q24', sec: 'bonding', key: 'bonding.test', show: c.tech, q: 'What should we test before shipping?',
      opts: [{ v: 'visual', l: 'Visual inspection only' }, { v: 'continuity', l: 'Continuity check' }, { v: 'pull-test', l: 'Pull test on sample bonds' },
        { v: 'power-up', l: 'Power-up with my instructions' }, NS] },

    // ---- 5 order and logistics ------------------------------------------
    { id: 'q36', sec: 'order', key: 'order.purpose', q: 'What is this run for?',
      opts: [{ v: 'bring-up', l: 'First bring-up of a new chip' }, { v: 'research', l: 'Research or teaching' }, { v: 'demo', l: 'Demo or evaluation boards' },
        { v: 'series', l: 'Small series for sale' }, { v: 'unspecified', l: 'Not sure yet' }] },
    { id: 'q23', sec: 'order', key: 'order.quantity', q: 'How many bonded boards do you need?',
      opts: [{ v: '1-5', l: '1 to 5' }, { v: '6-20', l: '6 to 20' }, { v: '21-100', l: '21 to 100' }, { v: 'more', l: 'More', input: 'number', ph: 'number of boards' }, NS] },
    { id: 'q37', sec: 'order', key: 'order.deadline', q: 'When do you need the boards?',
      opts: [{ v: 'none', l: 'No deadline' }, { v: '4-weeks', l: 'Within 4 weeks' }, { v: '8-weeks', l: 'Within 8 weeks' }, { v: 'date', l: 'Fixed date', input: 'date' }, NS] },
    { id: 'q38', sec: 'order', key: 'order.ship_to', q: 'Where should we ship to?',
      opts: [{ v: 'eu', l: 'EU' }, { v: 'uk', l: 'UK' }, { v: 'usa', l: 'USA' }, { v: 'china', l: 'China' }, { v: 'other', l: 'Other', input: 'text', ph: 'country' }] },
    { id: 'q50', sec: 'order', key: 'order.chip_storage', q: 'Are you interested in us storing some of your chips in a controlled environment?',
      opts: [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }, { v: 'unspecified', l: 'Not sure, tell me more' }] },
    { id: 'q39', sec: 'order', key: 'order.spares_and_rejects', q: 'What should happen with spare dies and failed boards?',
      opts: [{ v: 'send-back', l: 'Send everything back' }, { v: 'keep', l: 'Keep spares at outerfab for a later run' }, { v: 'dispose', l: 'Dispose' }, NS] },
    { id: 'q40', sec: 'order', key: 'order.nda', q: 'Do you need an NDA before sending files?',
      opts: [{ v: 'no', l: 'No' }, { v: 'outerfab-mutual', l: 'Yes, use the outerfab mutual NDA' }, { v: 'own', l: 'Yes, we have our own' }, NS] },
    { id: 'contact', sec: 'order', type: 'contact', key: 'contact', q: 'How can we reach you?',
      help: 'These details stay in your browser. They only leave it inside the result that you send yourself.',
      fields: [{ id: 'name', l: 'Name', ac: 'name' }, { id: 'organization', l: 'Organization', ac: 'organization' }, { id: 'email', l: 'E-mail', type: 'email', ac: 'email' }] },
  ];

  // ---- warnings: cases where a wrong assumption costs money --------------
  const WARN = [
    [a => a.q2 === 'planning', 'Early enquiry: the chip is still being planned.'],
    [a => a.q49 === 'complete' && a._upload && a._upload.complete === false, 'The uploaded open.cob.json was marked complete but is not (%upload%). The technical questions were asked.'],
    [a => c.tech(a) && a.q27 === 'copper', 'Copper pads: bondability has to be checked before a quote.'],
    [a => c.tech(a) && a.q27 === 'unspecified' && (a.q3 === 'other' || a.q3 === 'unspecified'), 'Pad metal and PDK are both unknown: has to be checked before a quote.'],
    [a => c.multi(a) && a.q42 === 'third-party' && (a.q27b === 'copper' || a.q27b === 'unspecified'), 'Pad metal of the third-party die has to be checked before a quote.'],
    [a => c.multi(a) && a.q43 === 'stacked', 'Stacked dies are a different process (spacer, wires over the die edge).'],
    [a => c.multi(a) && a.q41 !== 'no' && a.q47 === 'crossing', 'Crossing die-to-die wires cannot be quoted without a bonding diagram.'],
    [a => c.q13(a) && a.q13 === 'no', 'Board unknown: the customer designs the board alone and cannot share files in advance.'],
    [a => c.ownBoard(a) && a.q16 === 'hasl', 'HASL cannot be wire bonded. The board needs ENIG or ENEPIG.'],
    [a => c.ownBoard(a) && a.q16 === 'unspecified', 'Surface finish of the customer board is unknown: has to be checked before a quote.'],
  ];

  // ---- derived values ---------------------------------------------------
  const boardSource = a => {
    if (!c.tech(a)) return 'see open.cob.json';
    if (c.q13(a) && a.q13 === 'no') return 'unknown';
    if (c.ownBoard(a)) return 'customer';
    if (c.q14(a)) return 'outerfab orders customer design';
    if (c.q11(a) && yesish(a.q11)) return 'standard fan-out board';
    if (c.q12(a) && yesish(a.q12)) return 'outerfab designs the board';
    return 'unspecified';
  };

  window.COB = { Q, S, WARN, boardSource, cond: c };
})();
