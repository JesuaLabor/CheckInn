from django.contrib.admin.apps import AdminConfig
from django.contrib.auth.apps import AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig


class MongoAdminConfig(AdminConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'


class MongoAuthConfig(AuthConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'

    def ready(self):
        super().ready()
        # 1. Disconnect auth permission creation during post_migrate to prevent
        # unhashable __fake__.ContentType error with MongoDB BSON ObjectIds
        try:
            from django.db.models import signals
            from django.contrib.auth.management import create_permissions
            signals.post_migrate.disconnect(
                create_permissions,
                dispatch_uid='django.contrib.auth.management.create_permissions'
            )
        except Exception:
            pass

        # 2. Patch JSON encoders so BSON ObjectId instances serialize cleanly to strings
        try:
            from bson.objectid import ObjectId
            from rest_framework.utils.encoders import JSONEncoder
            from django.core.serializers.json import DjangoJSONEncoder

            orig_drf_default = JSONEncoder.default
            def patched_drf_default(self, obj):
                if isinstance(obj, ObjectId):
                    return str(obj)
                return orig_drf_default(self, obj)
            JSONEncoder.default = patched_drf_default

            orig_django_default = DjangoJSONEncoder.default
            def patched_django_default(self, obj):
                if isinstance(obj, ObjectId):
                    return str(obj)
                return orig_django_default(self, obj)
            DjangoJSONEncoder.default = patched_django_default
        except Exception:
            pass

        # 3. Configure DRF ModelSerializer to map MongoDB ObjectIds to strings
        try:
            from rest_framework import serializers
            import django_mongodb_backend.fields as mongo_fields
            serializers.ModelSerializer.serializer_field_mapping[mongo_fields.ObjectIdAutoField] = serializers.CharField
            serializers.ModelSerializer.serializer_field_mapping[mongo_fields.ObjectIdField] = serializers.CharField
        except Exception:
            pass


class MongoContentTypesConfig(ContentTypesConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
