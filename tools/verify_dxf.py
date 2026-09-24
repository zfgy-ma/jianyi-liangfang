# 独立校验脚本：用 ezdxf 回读导出的 DXF，核对版本、单位、图纸页、图层与审计结果
import sys
from collections import Counter
from pathlib import Path

try:
    import ezdxf
except ImportError:  # 本地没有安装时，允许从临时目录加载
    sys.path.insert(0, str(Path.home() / "AppData/Local/Temp/lf_dxf_spike/pylibs"))
    import ezdxf

EXPECTED_SHEETS = ["平面图", "东立面", "南立面", "西立面", "北立面", "等轴测"]


def main(path: Path) -> int:
    doc = ezdxf.readfile(path)
    audit = doc.audit()
    errors = list(audit.errors)
    fixes = list(audit.fixes)

    print("文件:", path)
    print("DXF 版本:", doc.dxfversion)
    print("单位 $INSUNITS:", doc.header.get("$INSUNITS"))
    print("审计：错误 %d 个，修复 %d 个" % (len(errors), len(fixes)))
    for item in errors[:5]:
        print("  错误:", getattr(item, "message", item))
    for item in fixes[:5]:
        print("  修复:", getattr(item, "message", item))

    names = [layout.name for layout in doc.layouts]
    print("图纸页:", names)
    for layout in doc.layouts:
        entities = list(layout)
        counts = Counter(entity.dxftype() for entity in entities)
        print("  %s 实体 %d 个 %s" % (layout.name, len(entities), dict(counts)))
    print("图层:", sorted(layer.dxf.name for layer in doc.layers))

    problems = []
    if doc.dxfversion != "AC1021":
        problems.append("DXF 版本不是 AC1021")
    if doc.header.get("$INSUNITS") != 4:
        problems.append("单位不是毫米")
    if errors:
        problems.append("审计存在错误")
    for sheet in EXPECTED_SHEETS:
        if sheet not in names:
            problems.append("缺少图纸页：" + sheet)

    if problems:
        print("校验未通过：")
        for item in problems:
            print("  -", item)
        return 1
    print("校验通过：审计 0 错误，图纸页齐全")
    return 0


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".validate/sample.dxf")
    raise SystemExit(main(target))
