import os
from pathlib import Path
import pandas as pd
from typing import Dict, Any, List

class MockDataPipeline:
    """
    Mock Data Pipeline for handling GCS or local datasets.
    """
    def __init__(self, data_path="../datasets"):
        base_dir = Path(__file__).parent.parent
        self.data_dir = base_dir / "datasets"

    def inspect_directory(self) -> Dict[str, Any]:
        """
        Recursively scans the /datasets directory.
        """
        supported_exts = ['.csv', '.xlsx', '.xls', '.xlsb', '.json']
        discovered = []
        
        if not self.data_dir.exists():
            return {"status": "missing", "expected_datasets": 11, "registry": []}
            
        for root, _, files in os.walk(self.data_dir):
            for file_name in files:
                ext = Path(file_name).suffix.lower()
                if ext in supported_exts:
                    full_path = Path(root) / file_name
                    discovered.append({
                        "name": file_name,
                        "path": str(full_path.relative_to(self.data_dir)),
                        "type": ext
                    })
                    
        return {
            "status": "operational",
            "message": "Local datasets connected and discovered.",
            "discovered_count": len(discovered),
            "registry": discovered
        }

    def generate_unified_schema(self, raw_data_dict):
        # Placeholder for data fusion per prompt.md rules
        schema = {
            "year": "int",
            "fips_county": "str",
            "homeless_population": "int",
            "sheltered_count": "int",
            "unsheltered_count": "int",
            "er_cost_per_person": "float",
            "shelter_cost_per_bed_night": "float",
            "incarceration_cost": "float",
            "psh_cost_per_unit": "float",
            "poverty_rate": "float",
            "source_flag": "str"
        }
        return schema
