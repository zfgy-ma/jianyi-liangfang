export interface DxfLayerSpec {
  name: string;
  color: number;
}

export interface DxfTablesInput {
  ltypeTable: string;
  ltypeContinuous: string;
  layerTable: string;
  layerHandles: string[];
  layers: DxfLayerSpec[];
  styleTable: string;
  styleStandard: string;
  blockRecordTable: string;
  modelBlockRecord: string;
  paperBlockRecords: string[];
  paperBlockNames: string[];
  layoutObjects: string[];
}

export function buildTablesSection(input: DxfTablesInput): string[] {
  return [
    '0', 'SECTION', '2', 'TABLES',

    '0', 'TABLE', '2', 'LTYPE',
    '5', input.ltypeTable, '330', '0', '100', 'AcDbSymbolTable', '70', '1',
    '0', 'LTYPE', '5', input.ltypeContinuous, '330', input.ltypeTable,
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbLinetypeTableRecord',
    '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'ENDTAB',

    '0', 'TABLE', '2', 'LAYER',
    '5', input.layerTable, '330', '0', '100', 'AcDbSymbolTable', '70',
    String(input.layers.length),
    ...input.layers.flatMap((layer, index) => [
      '0', 'LAYER', '5', input.layerHandles[index], '330', input.layerTable,
      '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
      '2', layer.name, '70', '0', '62', String(layer.color), '6', 'CONTINUOUS',
    ]),
    '0', 'ENDTAB',

    '0', 'TABLE', '2', 'STYLE',
    '5', input.styleTable, '330', '0', '100', 'AcDbSymbolTable', '70', '1',
    '0', 'STYLE', '5', input.styleStandard, '330', input.styleTable,
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbTextStyleTableRecord',
    '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0',
    '42', '2.5', '3', 'simsun.ttc', '4', '',
    '0', 'ENDTAB',

    '0', 'TABLE', '2', 'BLOCK_RECORD',
    '5', input.blockRecordTable, '330', '0', '100', 'AcDbSymbolTable', '70',
    String(1 + input.paperBlockRecords.length),
    '0', 'BLOCK_RECORD', '5', input.modelBlockRecord, '330', input.blockRecordTable,
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbBlockTableRecord',
    '2', '*Model_Space', '70', '0', '280', '1', '281', '0',
    ...input.paperBlockRecords.flatMap((handle, index) => [
      '0', 'BLOCK_RECORD', '5', handle, '330', input.blockRecordTable,
      '100', 'AcDbSymbolTableRecord', '100', 'AcDbBlockTableRecord',
      '2', input.paperBlockNames[index], '340', input.layoutObjects[index],
      '70', '0', '280', '1', '281', '0',
    ]),
    '0', 'ENDTAB',
    '0', 'ENDSEC',
  ];
}

export interface DxfBlocksInput {
  modelBlock: string;
  modelEndBlock: string;
  modelBlockRecord: string;
  /** 模型空间图元，放在 *Model_Space 块里 */
  modelEntities: string[];
  paperBlocks: { block: string; end: string }[];
  paperBlockRecords: string[];
  paperBlockNames: string[];
  layoutObjects: string[];
  /** 每张图纸页的图元，按顺序放在各自纸空间块里 */
  paperEntities: string[][];
}

export function buildBlocksSection(input: DxfBlocksInput): string[] {
  return [
    '0', 'SECTION', '2', 'BLOCKS',
    '0', 'BLOCK', '5', input.modelBlock, '330', input.modelBlockRecord,
    '100', 'AcDbEntity', '8', '0', '100', 'AcDbBlockBegin',
    '2', '*Model_Space', '70', '0',
    '10', '0.0', '20', '0.0', '30', '0.0', '3', '*Model_Space', '1', '',
    ...input.modelEntities,
    '0', 'ENDBLK', '5', input.modelEndBlock, '330', input.modelBlockRecord,
    '100', 'AcDbEntity', '8', '0', '100', 'AcDbBlockEnd',
    ...input.paperBlocks.flatMap((block, index) => [
      '0', 'BLOCK', '5', block.block, '330', input.paperBlockRecords[index],
      '100', 'AcDbEntity', '8', '0', '100', 'AcDbBlockBegin',
      '2', input.paperBlockNames[index], '70', '0',
      '10', '0.0', '20', '0.0', '30', '0.0', '3', input.paperBlockNames[index],
      '1', '', '340', input.layoutObjects[index],
      ...(input.paperEntities[index] ?? []),
      '0', 'ENDBLK', '5', block.end, '330', input.paperBlockRecords[index],
      '100', 'AcDbEntity', '8', '0', '100', 'AcDbBlockEnd',
    ]),
    '0', 'ENDSEC',
  ];
}
