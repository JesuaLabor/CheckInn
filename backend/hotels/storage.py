import os
import uuid
import base64
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

DEFAULT_HOTEL_COVER = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
DEFAULT_ROOM_PHOTO = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'


def upload_image_to_storage(image_input, folder="localstay/hotels", default=DEFAULT_HOTEL_COVER):
    """
    Uploads an image (UploadedFile, Base64 data URI, or URL) to Cloudinary if configured.
    Falls back gracefully to local storage or default image preset.
    Returns a secure absolute HTTPS URL whenever Cloudinary is active.
    """
    if not image_input:
        return default

    # 1. If it's already an absolute HTTP/HTTPS URL (e.g. Unsplash preset or Cloudinary)
    if isinstance(image_input, str) and (image_input.startswith('http://') or image_input.startswith('https://')):
        return image_input

    # 2. Check if Cloudinary credentials are configured
    cloud_name = str(getattr(settings, 'CLOUDINARY_CLOUD_NAME', '') or os.environ.get('CLOUDINARY_CLOUD_NAME', '')).strip().strip('"\'')
    api_key = str(getattr(settings, 'CLOUDINARY_API_KEY', '') or os.environ.get('CLOUDINARY_API_KEY', '')).strip().strip('"\'')
    api_secret = str(getattr(settings, 'CLOUDINARY_API_SECRET', '') or os.environ.get('CLOUDINARY_API_SECRET', '')).strip().strip('"\'')

    has_cloudinary = bool(cloud_name and api_key and api_secret)

    if has_cloudinary:
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True,
            )

            # Cloudinary handles file-like objects, bytes, and base64 strings directly!
            upload_target = image_input
            if hasattr(image_input, 'file'):
                upload_target = image_input.file
            elif hasattr(image_input, 'read'):
                upload_target = image_input

            res = cloudinary.uploader.upload(
                upload_target,
                folder=folder,
                resource_type="image",
                overwrite=True,
            )
            secure_url = res.get('secure_url') or res.get('url')
            if secure_url:
                logger.info(f"[Cloudinary] Image uploaded successfully: {secure_url}")
                return secure_url
        except Exception as e:
            logger.exception(f"[Cloudinary] Upload failed: {e}. Falling back to storage fallback.")

    # 3. Fallback: Base64 string decoding to local storage
    if isinstance(image_input, str):
        if image_input.startswith('data:image/') and ';base64,' in image_input:
            try:
                header, b64data = image_input.split(';base64,', 1)
                mime = header.split(';')[0].replace('data:image/', '')
                ext = 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                sub_folder = folder.split('/')[-1]
                filename = f"{sub_folder}/{uuid.uuid4().hex}.{ext}"
                file_path = default_storage.save(filename, ContentFile(base64.b64decode(b64data)))
                return f"/media/{file_path}"
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {e}")
                return default
        return image_input

    # 4. Fallback: UploadedFile to local storage
    try:
        ext = os.path.splitext(getattr(image_input, 'name', 'photo.jpg'))[1].lower() or '.jpg'
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.avif']:
            ext = '.jpg'
        sub_folder = folder.split('/')[-1]
        filename = f"{sub_folder}/{uuid.uuid4().hex}{ext}"
        file_path = default_storage.save(filename, image_input)
        return f"/media/{file_path}"
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        return default
