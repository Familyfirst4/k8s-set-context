import * as fs from 'fs'
import * as core from '@actions/core'
import {getRequiredInputError} from '../../tests/util'
import {createKubeconfig, getDefaultKubeconfig} from './default'

describe('Default kubeconfig', () => {
   test('it creates a kubeconfig with proper format', () => {
      const certAuth = 'certAuth'
      const token = 'token'
      const clusterUrl = 'clusterUrl'

      const kc = createKubeconfig(certAuth, token, clusterUrl)
      const expected = JSON.stringify({
         apiVersion: 'v1',
         kind: 'Config',
         clusters: [
            {
               name: 'default',
               cluster: {
                  server: clusterUrl,
                  'certificate-authority-data': certAuth,
                  'insecure-skip-tls-verify': false
               }
            }
         ],
         users: [{name: 'default-user', user: {token}}],
         contexts: [
            {
               name: 'loaded-context',
               context: {
                  cluster: 'default',
                  user: 'default-user',
                  name: 'loaded-context'
               }
            }
         ],
         preferences: {},
         'current-context': 'loaded-context'
      })
      expect(kc).toBe(expected)
   })

   test('it throws error without method', () => {
      expect(() => getDefaultKubeconfig()).toThrow(
         getRequiredInputError('method')
      )
   })

   describe('default method', () => {
      beforeEach(() => {
         process.env['INPUT_METHOD'] = 'default'
      })

      test('it throws error without kubeconfig', () => {
         expect(() => getDefaultKubeconfig()).toThrow(
            getRequiredInputError('kubeconfig')
         )
      })

      test('it gets default config through kubeconfig input', () => {
         const kc = 'example kc'
         process.env['INPUT_KUBECONFIG'] = kc

         expect(getDefaultKubeconfig()).toBe(kc)
      })

      test('returns kubeconfig as plaintext when encoding is plaintext', () => {
         const kc = 'example kc'
         jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'method') return 'default'
            if (name === 'kubeconfig-encoding') return 'plaintext'
            if (name === 'kubeconfig') return kc
            return ''
         })
         expect(getDefaultKubeconfig()).toBe(kc)
      })

      test('it gets default config through base64 kubeconfig input', () => {
         const kc = 'example kc'
         const base64Kc = Buffer.from(kc, 'utf-8').toString('base64')

         jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'method') return 'default'
            if (name === 'kubeconfig-encoding') return 'base64'
            if (name === 'kubeconfig') return base64Kc
            return ''
         })

         expect(getDefaultKubeconfig()).toBe(kc)
      })

      test('it throws error for unknown kubeconfig-encoding', () => {
         const kc = 'example kc'
         const unknownEncoding = 'foobar'

         jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'method') return 'default'
            if (name === 'kubeconfig-encoding') return unknownEncoding
            if (name === 'kubeconfig') return kc
            return ''
         })

         expect(() => getDefaultKubeconfig()).toThrow(
            "Invalid kubeconfig-encoding: 'foobar'. Must be 'plaintext' or 'base64'."
         )
      })
   })

   test('it defaults to default method', () => {
      process.env['INPUT_METHOD'] = 'unknown'

      const kc = 'example kc'
      process.env['INPUT_KUBECONFIG'] = kc

      expect(getDefaultKubeconfig()).toBe(kc)
   })

   test('it defaults to default method from service-principal', () => {
      process.env['INPUT_METHOD'] = 'service-principal'

      const kc = 'example kc'
      process.env['INPUT_KUBECONFIG'] = kc

      expect(getDefaultKubeconfig()).toBe(kc)
   })

   describe('service-account method', () => {
      beforeEach(() => {
         process.env['INPUT_METHOD'] = 'service-account'
      })

      test('it throws error without cluster url', () => {
         expect(() => getDefaultKubeconfig()).toThrow(
            getRequiredInputError('k8s-url')
         )
      })

      test('it throws error without k8s secret', () => {
         process.env['INPUT_K8S-URL'] = 'url'

         expect(() => getDefaultKubeconfig()).toThrow(
            getRequiredInputError('k8s-secret')
         )
      })

      test('it gets kubeconfig through service-account', () => {
         const k8sUrl = 'https://testing-dns-4za.hfp.earth.azmk8s.io:443'
         const token = 'ZXlKaGJHY2lPcUpTVXpJMU5pSX='
         const cert = 'LS0tLS1CRUdJTiBDRWyUSUZJQ'
         const k8sSecret = fs.readFileSync('tests/sample-secret.yml').toString()

         process.env['INPUT_K8S-URL'] = k8sUrl
         process.env['INPUT_K8S-SECRET'] = k8sSecret

         const expectedConfig = JSON.stringify({
            apiVersion: 'v1',
            kind: 'Config',
            clusters: [
               {
                  name: 'default',
                  cluster: {
                     server: k8sUrl,
                     'certificate-authority-data': cert,
                     'insecure-skip-tls-verify': false
                  }
               }
            ],
            users: [
               {
                  name: 'default-user',
                  user: {token: Buffer.from(token, 'base64').toString()}
               }
            ],
            contexts: [
               {
                  name: 'loaded-context',
                  context: {
                     cluster: 'default',
                     user: 'default-user',
                     name: 'loaded-context'
                  }
               }
            ],
            preferences: {},
            'current-context': 'loaded-context'
         })

         expect(getDefaultKubeconfig()).toBe(expectedConfig)
      })
   })
})
