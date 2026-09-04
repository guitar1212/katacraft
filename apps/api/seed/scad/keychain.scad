// KataCraft sample model: customizable text keychain
text = "KataCraft";
width = 60;
height = 25;
thickness = 4;
hole = true;
shape = "rounded";

module rounded_rect(w, h, r) {
  hull() {
    for (x = [r, w - r])
      for (y = [r, h - r])
        translate([x, y]) circle(r = r, $fn = 32);
  }
}

module plate() {
  if (shape == "rounded") {
    linear_extrude(height = thickness) rounded_rect(width, height, 6);
  } else {
    cube([width, height, thickness]);
  }
}

module hole_cutout() {
  if (hole) {
    translate([10, height / 2, -1])
      cylinder(h = thickness + 2, r = 2.5, $fn = 32);
  }
}

difference() {
  plate();
  hole_cutout();
  translate([width / 2, height / 2, thickness - 1])
    linear_extrude(height = 1.2)
      text(text, size = height * 0.35, halign = "center", valign = "center", font = "Liberation Sans:style=Bold");
}
