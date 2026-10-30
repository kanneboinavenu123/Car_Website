import os
from PIL import Image, ImageOps, ImageFilter

brain_dir = r'C:\Users\Venu yadav\.gemini\antigravity\brain\b6834162-20ec-4606-91a3-f4fef1a15dea'
os.makedirs('assets/cars', exist_ok=True)

# Precise measurement of each car in the 1376x768 images
# (car_left, car_right, wheel_contact_y, flip_horizontal)
CAR_METRICS = {
    'gt-e': {
        'file': 'noctis_gte_profile_1793352748629.jpg',
        'flip': False,
        'car_left': 118,
        'car_right': 1262,
        'wheel_y': 585
    },
    's': {
        'file': 'noctis_s_studio_side_profile_1793352761263.jpg',
        'flip': False,
        'car_left': 72,
        'car_right': 1308,
        'wheel_y': 610
    },
    'x': {
        'file': 'noctis_x_side_profile_1793352774811.jpg',
        'flip': True, # Flipped to face right
        'car_left': 116,
        'car_right': 1248,
        'wheel_y': 576
    },
    'r': {
        'file': 'noctis_r_side_profile_1793352785671.jpg',
        'flip': False,
        'car_left': 116,
        'car_right': 1284,
        'wheel_y': 582
    },
    'one': {
        'file': 'noctis_one_profile_1793352687307.jpg',
        'flip': True, # Flipped to face right
        'car_left': 112,
        'car_right': 1256,
        'wheel_y': 568
    }
}

TARGET_W = 1600
TARGET_H = 900
TARGET_CAR_WIDTH = int(TARGET_W * 0.70) # 1120px
TARGET_WHEEL_Y = int(TARGET_H * 0.72)   # 648px
BG_COLOR = (7, 8, 10)                  # #07080A

for name, meta in CAR_METRICS.items():
    src_path = os.path.join(brain_dir, meta['file'])
    im = Image.open(src_path).convert('RGB')
    if meta['flip']:
        im = ImageOps.mirror(im)
    
    src_w, src_h = im.size
    car_left = meta['car_left']
    car_right = meta['car_right']
    wheel_y = meta['wheel_y']
    src_car_w = car_right - car_left
    
    scale = TARGET_CAR_WIDTH / float(src_car_w)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    
    im_scaled = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Calculate paste coordinates
    # Center car horizontally:
    # car_left * scale + offset_x = (TARGET_W - TARGET_CAR_WIDTH) / 2 = 240
    offset_x = int((TARGET_W - TARGET_CAR_WIDTH) / 2.0 - (car_left * scale))
    # Wheels at 72% height:
    # wheel_y * scale + offset_y = TARGET_WHEEL_Y = 648
    offset_y = int(TARGET_WHEEL_Y - (wheel_y * scale))
    
    # Create final 16:9 canvas
    canvas = Image.new('RGB', (TARGET_W, TARGET_H), BG_COLOR)
    
    # We want seamless blend with #07080A. Let's create an alpha mask for im_scaled:
    # Far left, far right, top, and bottom fade gently to BG_COLOR
    mask = Image.new('L', (new_w, new_h), 255)
    
    # Blend into canvas
    canvas.paste(im_scaled, (offset_x, offset_y))
    
    # Ensure canvas edges and outer areas are strictly flat #07080A
    # Let's clean the border margins:
    # top 0..120, bottom 780..900, left 0..80, right 1520..1600
    for y in range(TARGET_H):
        for x in range(TARGET_W):
            # If outside car bounding box plus soft margin, clamp background to #07080A
            car_x1 = offset_x + int(car_left * scale) - 30
            car_x2 = offset_x + int(car_right * scale) + 30
            car_y1 = offset_y + int((wheel_y - 350) * scale) - 30
            car_y2 = offset_y + int(wheel_y * scale) + 60
            
            p = canvas.getpixel((x, y))
            # Distance from car box
            dx = max(0, car_x1 - x, x - car_x2)
            dy = max(0, car_y1 - y, y - car_y2)
            dist = (dx**2 + dy**2)**0.5
            
            if dist > 80:
                canvas.putpixel((x, y), BG_COLOR)
            elif dist > 0:
                alpha = dist / 80.0
                r = int(p[0] * (1 - alpha) + BG_COLOR[0] * alpha)
                g = int(p[1] * (1 - alpha) + BG_COLOR[1] * alpha)
                b = int(p[2] * (1 - alpha) + BG_COLOR[2] * alpha)
                canvas.putpixel((x, y), (r, g, b))
                
    out_path = f'assets/cars/{name}.webp'
    canvas.save(out_path, 'WEBP', quality=85, method=6)
    print(f'Saved {out_path} ({TARGET_W}x{TARGET_H}, size={os.path.getsize(out_path)} bytes)')

print('All 5 lineup cars successfully processed!')
