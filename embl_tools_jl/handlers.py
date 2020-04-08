import json

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join
import tornado
import os

class EBML_tools_handler(APIHandler):
    @property
    def contents_manager(self):
        """Currently configured notebook server ContentsManager."""
        return self.settings['contents_manager']

    @property
    def root_dir(self):
        """Root directory to scan."""
        return self.contents_manager.root_dir

    def scan_disk(self, path):
        for entry in os.scandir(path):
            if entry.is_dir():
                if entry.name == 'EMBL-Tools':
                    return os.path.relpath(os.path.dirname(entry.path), self.root_dir)+'/'+entry.name
                subdir_scan=self.scan_disk(entry.path)
                if subdir_scan:
                    return subdir_scan
        return None

    # The following decorator should be present on all verb methods (head, get, post, 
    # patch, put, delete, options) to ensure only authorized user can request the 
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        embl_path = self.scan_disk(self.root_dir)
        self.finish(json.dumps({
            "path": embl_path,
            "found": not(embl_path==None)
        }))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "embl-tools-jl", "findtools")
    handlers = [(route_pattern, EBML_tools_handler)]
    web_app.add_handlers(host_pattern, handlers)
