# Browser background removal

U²-Net / U2NETP by Xuebin Qin and collaborators:
https://github.com/xuebinqin/U-2-Net
Apache-2.0 license, reproduced in U2NET-LICENSE.txt.

ONNX model distributed by rembg:
https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
Verified MD5: 8e83ca70e441ab06c318d82300c84806.

ONNX Runtime Web 1.21.0 by Microsoft:
https://github.com/microsoft/onnxruntime
MIT license, reproduced in ONNX-LICENSE.txt.
Runtime files are copied from the pinned npm dependency at install/build time.

Motorva performs local inference in a dedicated browser worker. The input
photo is not transmitted to an inference service. A saved account photo is
still uploaded to Motorva through the normal authenticated garage API.
