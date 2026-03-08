# Run this macro in FreeCAD GUI to apply colors
# Macro > Execute Macro > select this file

import FreeCAD, FreeCADGui

doc = FreeCAD.ActiveDocument

colors = {
    "Keks_Base":           (0.85, 0.70, 0.40, 0.0),  # golden baked cookie
    "Punschkrapferlmasse": (0.55, 0.25, 0.15, 0.0),  # dark brown filling
    "Punschglasur":        (0.85, 0.15, 0.30, 0.0),  # pink-red punch glaze
    "Halbe_Belegkirsche":  (0.70, 0.05, 0.10, 0.0),  # dark red cherry
}

for name, color in colors.items():
    obj = doc.getObject(name)
    if obj and obj.ViewObject:
        obj.ViewObject.ShapeColor = color
        if name == "Punschglasur":
            obj.ViewObject.Transparency = 0

# Hide the inner filling (it's covered by the glaze)
inner = doc.getObject("Punschkrapferlmasse")
if inner and inner.ViewObject:
    inner.ViewObject.Visibility = False

FreeCADGui.ActiveDocument.ActiveView.fitAll()
FreeCADGui.ActiveDocument.ActiveView.viewIsometric()
