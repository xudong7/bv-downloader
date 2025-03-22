# BV Downloader

[English](README.md) | [简体中文](README_zh.md)

A command-line tool for downloading videos from Bilibili using BV numbers or video URLs.

## display

![display](./assets/display.gif)

## Features

- Download videos via Bilibili video URL or BV number
- Support for single video or collection download
- Custom download directory selection
- Batch download for multi-part videos
- Video metadata fetching and display
- Real-time progress bar
- Auto-creation of collection directories
- Smart filename handling

## Prerequisites

- Node.js v16 or above
- npm or yarn package manager

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bv-downloader.git

# Enter the project directory
cd bv-downloader

# Install dependencies
npm install
```

## Usage

1. Start the program:
```bash
npm start
```

2. Input video URL:
- Supports full Bilibili video URLs
- Example: https://www.bilibili.com/video/BV1xx411c7mD

3. Set download directory:
- Specify a custom download directory
- Press Enter to use current directory

4. Choose download mode:
- Option 1: Download single video
- Option 2: Download entire collection (if available)

## Notes

- Ensure sufficient disk space
- Maintain internet connection during download
- Videos are downloaded in original quality
- Collections will be saved in dedicated folders

## Disclaimer

This tool is for personal learning and research purposes only. The author assumes no responsibility for any consequences resulting from the use of this tool. Users should:

- Use this tool in compliance with relevant laws and regulations
- Respect copyright and intellectual property rights
- Bear all risks and responsibilities arising from the use of this tool
- Not use this tool for any commercial purposes
- Not use this tool to download unauthorized content

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to the Bilibili API
- All contributors to this project
