import os
import re
import time
from PIL import Image
from concurrent.futures import ProcessPoolExecutor

def natural_sort_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

def process_single(args):
    src_path, out_1600, out_960 = args
    with Image.open(src_path) as im:
        im = im.convert('RGB')
        im_1600 = im.resize((1600, 900), Image.Resampling.LANCZOS)
        im_1600.save(out_1600, 'WEBP', quality=78, method=4)
        im_960 = im.resize((960, 540), Image.Resampling.LANCZOS)
        im_960.save(out_960, 'WEBP', quality=72, method=4)

def get_folder_info(folder):
    files = [f for f in os.listdir(folder) if f.endswith('.webp')]
    total_size = sum(os.path.getsize(os.path.join(folder, f)) for f in files)
    return len(files), total_size

def main():
    t0 = time.time()
    os.makedirs('assets/frames/hero', exist_ok=True)
    os.makedirs('assets/frames/hero-mobile', exist_ok=True)
    os.makedirs('assets/frames/dismantle', exist_ok=True)
    os.makedirs('assets/frames/dismantle-mobile', exist_ok=True)

    hero_files = []
    for d in ['clip1frame', 'clip2frame', 'clip3frame']:
        files = sorted(os.listdir(d), key=natural_sort_key)
        for f in files:
            hero_files.append(os.path.join(d, f))

    tasks = []
    for idx, src in enumerate(hero_files, 1):
        out_1600 = f'assets/frames/hero/frame_{idx:04d}.webp'
        out_960 = f'assets/frames/hero-mobile/frame_{idx:04d}.webp'
        tasks.append((src, out_1600, out_960))

    dismantle_files = sorted(os.listdir('Flowclipframe'), key=natural_sort_key)
    for idx, f in enumerate(dismantle_files, 1):
        src = os.path.join('Flowclipframe', f)
        out_1600 = f'assets/frames/dismantle/frame_{idx:04d}.webp'
        out_960 = f'assets/frames/dismantle-mobile/frame_{idx:04d}.webp'
        tasks.append((src, out_1600, out_960))

    print(f'Starting processing {len(tasks)} frames ({len(hero_files)} hero + {len(dismantle_files)} dismantle)...')
    with ProcessPoolExecutor() as executor:
        for i, _ in enumerate(executor.map(process_single, tasks), 1):
            if i % 100 == 0 or i == len(tasks):
                print(f'Processed {i}/{len(tasks)} frames in {time.time()-t0:.1f}s')

    print('\n--- SUMMARY ---')
    for folder in ['assets/frames/hero', 'assets/frames/hero-mobile', 'assets/frames/dismantle', 'assets/frames/dismantle-mobile']:
        count, size = get_folder_info(folder)
        size_mb = size / (1024 * 1024)
        print(f'{folder}: {count} frames, {size_mb:.2f} MB ({size} bytes)')

if __name__ == '__main__':
    main()
