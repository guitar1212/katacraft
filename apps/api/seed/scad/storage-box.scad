// KataCraft sample model: parametric open storage box
length = 80;
width = 60;
height = 40;
wall = 2.5;

module rounded_rect(l, w, r) {
  hull() {
    for (x = [r, l - r])
      for (y = [r, w - r])
        translate([x, y]) circle(r = r, $fn = 32);
  }
}

difference() {
  linear_extrude(height = height) rounded_rect(length, width, 4);
  translate([0, 0, wall])
    linear_extrude(height = height) rounded_rect(length - 2 * wall, width - 2 * wall, max(4 - wall, 1));
}
