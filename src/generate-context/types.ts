export type FileContext = {
  path: string;
  imports: string[];
  classes: string[];
  methods: string[];
};

export type FeatureContext = {
  name: string;
  files: FileContext[];
};
