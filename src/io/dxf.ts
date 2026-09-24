import { serializeEntity, type DxfEntity } from './dxfEntities';
import { buildBlocksSection, buildTablesSection, type DxfLayerSpec } from './dxfTables';

export type { DxfLayerSpec };
export type { DxfEntity };

export interface DxfSheetSpec {
  /** 页签名，例如“平面图” */
  name: string;
  /** 图幅，毫米，A3 横放即 420 × 297 */
  width: number;
  height: number;
  entities: DxfEntity[];
}

export interface DxfInput {
  layers: DxfLayerSpec[];
  /** 模型空间内容，通常留空，图纸都放图纸空间 */
  modelEntities: DxfEntity[];
  sheets: DxfSheetSpec[];
}

/** 句柄分配器：从 0x200 起，避开表与块记录的保留段 */
function createHandles() {
  let value = 0x200;
  return () => (value++).toString(16).toUpperCase();
}

/** 纸空间块名：第一个沿用 *Paper_Space，之后依次编号 */
export function paperBlockName(index: number): string {
  return index === 0 ? '*Paper_Space' : `*Paper_Space${index - 1}`;
}

/** 去掉名称里不允许出现在 DXF 符号名中的字符 */
export function safeName(name: string): string {
  const cleaned = name.replace(/[\r\n<>/\\:;?*|=`,]/g, ' ').trim();
  return cleaned === '' ? 'SHEET' : cleaned;
}

interface LayoutObjectInput {
  handle: string;
  owner: string;
  name: string;
  tabOrder: number;
  width: number;
  height: number;
  paperBlockRecord: string;
}

/**
 * LAYOUT 对象。字段顺序照抄标准 R2007 文件：
 * AcDbPlotSettings 描述打印设置，AcDbLayout 描述页签名、页序、图幅与所属纸空间块记录。
 */
function layoutObjectText(input: LayoutObjectInput): (string | number)[] {
  return [
    '0', 'LAYOUT', '5', input.handle, '330', input.owner,
    '100', 'AcDbPlotSettings',
    '1', '', '2', 'none_device', '4', '', '6', '',
    '40', '0.0', '41', '0.0', '42', '0.0', '43', '0.0',
    '44', input.width.toFixed(1), '45', input.height.toFixed(1),
    '46', '0.0', '47', '0.0', '48', '0.0', '49', '0.0',
    '140', '0.0', '141', '0.0', '142', '1.0', '143', '1.0',
    '70', '0', '72', '1', '73', '0', '74', '5', '7', '',
    '75', '16', '76', '0', '77', '2', '78', '300',
    '147', '1.0', '148', '0.0', '149', '0.0',
    '100', 'AcDbLayout',
    '1', input.name,
    '70', '1', '71', String(input.tabOrder),
    '10', '0.0', '20', '0.0',
    '11', input.width.toFixed(1), '21', input.height.toFixed(1),
    '12', '0.0', '22', '0.0', '32', '0.0',
    '14', '0.0', '24', '0.0', '34', '0.0',
    '15', input.width.toFixed(1), '25', input.height.toFixed(1), '35', '0.0',
    '146', '0.0',
    '13', '0.0', '23', '0.0', '33', '0.0',
    '16', '1.0', '26', '0.0', '36', '0.0',
    '17', '0.0', '27', '1.0', '37', '0.0',
    '76', '1',
    '330', input.paperBlockRecord,
  ];
}

/** 生成完整的 AC1021 DXF 文本：UTF-8 编码、毫米单位、每个视图一张图纸空间页 */
export function buildDxf(input: DxfInput): string {
  const next = createHandles();
  const join = (parts: (string | number)[]) => parts.join('\n');

  const ltypeTable = next();
  const ltypeContinuous = next();
  const layerTable = next();
  const styleTable = next();
  const styleStandard = next();
  const blockRecordTable = next();

  const layers: DxfLayerSpec[] = [
    { name: '0', color: 7 },
    ...input.layers.filter((layer) => layer.name !== '0'),
  ];
  const layerHandles = layers.map(() => next());

  const modelBlockRecord = next();
  const paperBlockRecords = input.sheets.map(() => next());
  const layoutObjects = input.sheets.map(() => next());
  const modelLayoutObject = next();
  const layoutDict = next();
  const rootDict = next();
  const modelBlock = next();
  const modelEndBlock = next();
  const paperBlocks = input.sheets.map(() => ({ block: next(), end: next() }));

  const paperBlockNames = input.sheets.map((_, index) => paperBlockName(index));
  const sheetNames = input.sheets.map((sheet) => safeName(sheet.name));

  const tables = buildTablesSection({
    ltypeTable,
    ltypeContinuous,
    layerTable,
    layerHandles,
    layers,
    styleTable,
    styleStandard,
    blockRecordTable,
    modelBlockRecord,
    paperBlockRecords,
    paperBlockNames,
    layoutObjects,
  });

  const modelEntities = input.modelEntities.map((entity) =>
    serializeEntity(entity, next(), modelBlockRecord),
  );
  const paperEntities = input.sheets.map((sheet, index) =>
    sheet.entities.map((entity) =>
      serializeEntity(entity, next(), paperBlockRecords[index]),
    ),
  );
  const blocks = buildBlocksSection({
    modelBlock,
    modelEndBlock,
    modelBlockRecord,
    modelEntities,
    paperBlocks,
    paperBlockRecords,
    paperBlockNames,
    layoutObjects,
    paperEntities,
  });

  // ENTITIES 段只放模型空间，纸空间图元在各自 BLOCK 里
  const entities = join(['0', 'SECTION', '2', 'ENTITIES', '0', 'ENDSEC']);

  const objects = join([
    '0', 'SECTION', '2', 'OBJECTS',
    '0', 'DICTIONARY', '5', rootDict, '330', '0',
    '100', 'AcDbDictionary', '281', '1',
    '3', 'ACAD_LAYOUT', '350', layoutDict,
    '0', 'DICTIONARY', '5', layoutDict, '330', rootDict,
    '100', 'AcDbDictionary', '281', '1',
    '3', 'Model', '350', modelLayoutObject,
    ...input.sheets.flatMap((_, index) => [
      '3', sheetNames[index], '350', layoutObjects[index],
    ]),
    ...layoutObjectText({
      handle: modelLayoutObject,
      owner: layoutDict,
      name: 'Model',
      tabOrder: 0,
      width: 420,
      height: 297,
      paperBlockRecord: modelBlockRecord,
    }),
    ...input.sheets.flatMap((sheet, index) =>
      layoutObjectText({
        handle: layoutObjects[index],
        owner: layoutDict,
        name: sheetNames[index],
        tabOrder: index + 1,
        width: sheet.width,
        height: sheet.height,
        paperBlockRecord: paperBlockRecords[index],
      }),
    ),
    '0', 'ENDSEC',
  ]);

  const handseed = next();
  const header = join([
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1021',
    '9', '$INSUNITS', '70', '4',
    '9', '$MEASUREMENT', '70', '1',
    '9', '$HANDSEED', '5', handseed,
    '0', 'ENDSEC',
  ]);
  const classes = join(['0', 'SECTION', '2', 'CLASSES', '0', 'ENDSEC']);

  return (
    [header, classes, join(tables), join(blocks), entities, objects, join(['0', 'EOF'])].join(
      '\n',
    ) + '\n'
  );
}
