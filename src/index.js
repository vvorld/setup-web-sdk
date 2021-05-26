const defaultOptions = {
  metadata: {},
  containerId: 'getid-component',
  profile: [],
  apiUrl: '',
  sdkKey: '',
  flowName: 'sdk-v6',
};
const defaultV5fields = [
  {
    label: 'First Name',
    type: 'text',
    name: 'First name',
    required: false,
    value: '',
    mask: {
      regexp: '^[a-zA-Z0-9 ]+$',
      translate: 'Form_only_latin',
      message: 'Only latin symbols',
    },
  },
  {
    label: 'Last Name',
    type: 'text',
    name: 'Last name',
    required: false,
    value: '',
    mask: {
      regexp: '^[a-zA-Z0-9 ]+$',
      translate: 'Form_only_latin',
      message: 'Only latin symbols',
    },
  },

  {
    label: 'Date Of Birth',
    type: 'date',
    name: 'Date of birth',
    required: true,
  },
  {
    label: 'Select example',
    type: 'select',
    options: [
      { name: 'H11', val: '11', translate: 'select_1' },
      { name: 'H22', val: '22', translate: 'select_2' },
    ],
    name: 'select example',
    required: false,
  },
  {
    type: 'file',
    name: 'Test field file',
    required: false,
  },
  {
    label: 'I have read and understand <a href="https://getid.ee">Terms of use</a> of GetID&nbspOÜ.',
    translate: 'consent',
    type: 'consent',
    name: 'privacy1',
  },
];

const defaultV5Flow = [
  {
    component: 'DocumentPhoto',
    showRules: true,
    interactive: true,
    enableCheckPhoto: true,
    country: 'ee',
    documentType: 'id-card',
  },
  {
    component: 'Form',
  },
  {
    component: 'Record',
    phrases: ['My name is...', 'I would like to receive a certificate...'],
  },
  { component: 'Liveness' },
  { component: 'Selfie', showRules: true, enableCheckPhoto: true },
  { component: 'ThankYou' },
];
const defaultCallbacks = {
  onComplete(dataOnComplete) {
    console.log('onComplete', dataOnComplete);
  },
  onBack() {
    console.log('onBack');
  },
  onFail(error) {
    console.log('onFail', error);
  },
  onVerificationComplete(data) {
    console.log('onVerificationComplete', data);
  },
  acceptableDocuments: (supportedCountry, supportedDocs) => {
    if (supportedCountry.length > 0 && supportedDocs.length > 0) {
      return (supportedDocuments) => supportedDocuments
        .filter(({ country }) => supportedCountry.includes(country.toLowerCase()))
        .map(({ country, documentTypes }) => ({
          country,
          documentTypes: documentTypes
            .filter((v) => supportedDocs.includes(v)),
        }));
    }
    if (supportedCountry.length > 0 && supportedDocs.length === 0) {
      return (supportedDocuments) => supportedDocuments
        .filter(({ country }) => supportedCountry.includes(country.toLowerCase()));
    }
    return (supportedDocuments) => supportedDocuments
      .map(({ country, documentTypes }) => ({
        country,
        documentTypes: documentTypes
          .filter((v) => supportedDocs.includes(v)),
      }));
  },
};
const enrichBySpecialKey = {
  mode: (config, node) => (node.checked ? { ...config, mode: 'popup' } : config),
  profile: (config) => config,
  onComplete: (config, node) => (
    node.checked ? { ...config, onComplete: defaultCallbacks.onComplete } : config
  ),
  onFail: (config, { checked }) => (
    checked ? { ...config, onFail: defaultCallbacks.onFail } : config
  ),
  onVerificationComplete: (config, { checked }) => (
    checked ? { ...config, onVerificationComplete: defaultCallbacks.onVerificationComplete }
      : config
  ),
  onBack: (config, { checked }) => (
    checked ? { ...config, onBack: defaultCallbacks.onBack }
      : config
  ),
  themeModeLight: (config, { checked }) => (
    checked ? { ...config, themeMode: 'light' } : config
  ),
  themeModeDark: (config, { checked }) => (
    checked ? { ...config, themeMode: 'dark' } : config
  ),
  themeMode: (config, { checked }) => (
    checked ? { ...config, themeMode: undefined } : config
  ),
};
const getMetadataFromForm = (formNodes) => {
  const externalId = formNodes.find(({ id }) => id === 'externalId');
  const labelKey = formNodes.find(({ id }) => id === 'labelKey');
  const labelValue = formNodes.find(({ id }) => id === 'labelValue');
  const result = {};
  if (externalId) result.externalId = externalId.value;
  if (labelKey && labelValue) result.labels = { [labelKey.value]: labelValue.value };
  return result;
};
const getProfileFromForm = (formNodes) => {
  const profileNode = formNodes.find(({ id }) => id === 'profile');
  if (!profileNode || !profileNode.checked) {
    return [];
  }
  return formNodes.filter(({ name }) => name.startsWith('profile_')).map(({ name, value }) => {
    const category = name.replace(/profile_/, '');
    return { category, value };
  });
};
const patchConfigAcceptableDocuments = (config, formNodes) => {
  const supportedCountry = formNodes.reduce((acc, node) => {
    if (!node.id.startsWith('supportedCountry') || !node.checked) return acc;
    const country = node.id.replace('supportedCountry_', '');
    return [...acc, country];
  }, []);
  const supportedDocs = formNodes.reduce((acc, node) => {
    if (!node.id.startsWith('supportedDocs') || !node.checked) return acc;
    const docType = node.id.replace('supportedDocs_', '').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return [...acc, docType];
  }, []);
  if (supportedCountry.length === 0 && supportedDocs.length === 0) return config;
  return {
    ...config,
    acceptableDocuments: defaultCallbacks.acceptableDocuments(supportedCountry, supportedDocs),
  };
};
const configKeys = new Set([
  'containerId', 'locale', 'apiUrl', 'sdkKey', 'flowName', 'customerId', 'jwt', 'injectCSS', 'styles',
]);
const loadSdkScript = (sdkVersion, cb) => {
  const script = document.createElement('script');
  script.src = `https://cdn.getid.cloud/sdk/getid-web-sdk-${sdkVersion}.min.js`;
  script.onerror = (err) => {
    console.error(err);
    document.querySelector('#sdkVersion').classList.add('is-invalid');
  };
  document.body.appendChild(script);
  script.onload = () => {
    document.querySelector('#sdkVersion').classList.remove('is-invalid');
    cb().then((res) => {
      if (res?.changeThemeMode) {
        const switchTheme = document.getElementById('switch-theme');
        switchTheme.addEventListener('change', ({ target }) => {
          res.changeThemeMode(target.checked ? 'dark' : 'light');
        });
      }
    }).catch(console.error);
  };
};
document.querySelector('#form-setting').addEventListener('submit', (event) => {
  event.preventDefault();
  const { target } = event;
  const formResult = [...target].filter(({ value }) => value);
  const config = formResult.reduce((acc, node) => {
    if (configKeys.has(node.id) && node.value) {
      return { ...acc, [node.id]: node.value };
    }
    if (node.id in enrichBySpecialKey) {
      return enrichBySpecialKey[node.id](acc, node);
    }
    return acc;
  }, defaultOptions);
  const metadata = getMetadataFromForm(formResult);
  const profile = getProfileFromForm(formResult);
  const initConfig = { ...patchConfigAcceptableDocuments(config, formResult), metadata, profile };
  console.log('initConfig', initConfig);
  const initCallback = () => window.getidWebSdk.init(initConfig);
  loadSdkScript([...formResult].find(({ id }) => id === 'sdkVersion')?.value || 'v6', initCallback);
});

document.querySelector('#v5-form-setting').addEventListener('submit', (event) => {
  event.preventDefault();
  const { target } = event;
  const formResult = [...target].filter(({ value }) => value);
  const formFields = formResult.filter(({ name, checked }) => name === 'fields' && checked === true).map(({ id }) => id);
  const normalizedFields = defaultV5fields.filter(({ name }) => formFields.includes(name));
  const flowFromForm = formResult.filter(({ name, checked }) => name === 'flows' && checked === true).map(({ id }) => id);
  const normalizedFlow = defaultV5Flow.reduce((acc, component) => {
    if (flowFromForm.includes(component.component)) {
      if (component.component !== 'Form') {
        return [...acc, component];
      }
      return [...acc, { ...component, fields: normalizedFields }];
    }
    return acc;
  }, []);
  const callbacksForm = formResult.filter(({ name, checked }) => name === 'callback' && checked === true).map(({ value }) => value);
  const callBacks = callbacksForm
    // eslint-disable-next-line max-len
    .reduce((acc, callbackName) => ({ ...acc, [callbackName]: defaultCallbacks[callbackName] }), {});

  const apiUrl = document.querySelector('#apiUrl-v5').value;
  const sdkKey = document.querySelector('#sdkKey-v5').value;
  const sdkVersion = document.querySelector('#sdkVersion-v5').value;
  const verificationTypes = ['data-extraction'];
  if (flowFromForm.includes('Selfie')) {
    verificationTypes.push('face-matching');
  }
  if (flowFromForm.includes('Liveness')) {
    verificationTypes.push('liveness');
  }
  const initConfig = {
    ...callBacks, flow: normalizedFlow, apiUrl, containerId: 'getid-component', verificationTypes,
  };
  console.log('initConfig', initConfig);
  const initCallback = () => window.getidWebSdk.init(initConfig, sdkKey);
  loadSdkScript(sdkVersion || 'v5', initCallback);
});

const profileCheckbox = document.querySelector('#profile');
const formsProfile = document.querySelectorAll('input[name^="profile"][type="text"]');
profileCheckbox.addEventListener('change', ({ target }) => {
  formsProfile.forEach((el) => {
    // eslint-disable-next-line no-param-reassign
    el.disabled = !target.checked;
  });
});
$('.checkbox-menu').on('change', "input[type='checkbox']", function () {
  $(this).closest('li').toggleClass('active', this.checked);
});
$(document).on('click', '.allow-focus', (e) => {
  e.stopPropagation();
});
