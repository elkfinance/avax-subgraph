/* eslint-disable prefer-const */
import { BigInt, BigDecimal, store, Address } from '@graphprotocol/graph-ts'
import {
  Pair,
  Token,
  ElkFactory,
  Transaction,
  Mint as MintEvent,
  Burn as BurnEvent,
  Swap as SwapEvent,
  Bundle
} from '../types/schema'
import { Pair as PairContract, Mint, Burn, Swap, Transfer, Sync } from '../types/templates/Pair/Pair'
import { updatePairDayData, updateTokenDayData, updateElkDayData, updatePairHourData } from './dayUpdates'
import { getEthPriceInUSD, findEthPerToken, getTrackedVolumeUSD, getTrackedLiquidityUSD } from './pricing'
import {
  convertTokenToDecimal,
  ADDRESS_ZERO,
  FACTORY_ADDRESS,
  ROUTER_ADDRESS,
  ONE_BI,
  createUser,
  createLiquidityPosition,
  ZERO_BD,
  BI_18,
  createLiquiditySnapshot
} from './helpers'

let MINING_POOLS: string[] = [
  // ALWAYS IN LOWER CASE!!
  // Round 11
  '0x9ec3ca469f415a7e55a21dc662d427d59e8de8f6', // avax-elk
  '0xe935028df3285d1852e11dae384534d27887c196', // usdc.e-elk
  '0x7eb3a69252b5a29d0239b45e088a4baec906a0b1', // dcau-elk
  '0xd3641c0ebe0361de44d0298e165943b6b0422d98', // eth.e-elk
  '0x51e07ff9c0f78f88b3c094a71d338d1681c3ad20', // teddy-elk
  '0x76d80ca1fc1dd8355b692f961d198dd7a2858edb', // avai-elk
  '0x5916de85c68db865f35df760f01110f09b5be90e', // melt-elk
  '0xebf8bd7a000d02849cced5feb2079028e2fa6d23', // h2o-elk
  '0x17c2e0d60b75961729aecc69ccc7e904b9411fa3', // racex-elk
  '0xc2c8944b0c66eca1b55dc9f9c959c1d6ac77f70e', // yak-elk
  '0xad7185fe19ef6607ab7631749373a261461adf7c', // joe-elk
  '0xa4f5447ce95fe4cdb7ecd023d6ea0274b85a27ff', // ave-elk
  '0x54d434c6688986b24a2d01df8e0c116744fca5f6', // snob-elk
  '0xcf025c16c9cd72eebf0513a1ed8f588f99d1bcd9', // png-elk
  '0x598acf0e3af1b81891403167e9ecd4744a1e6f9f', // vso-elk
  '0x1dd9d03da8d3fc3af45ad57d75fa99e97ca9abc6', // xava-elk
  '0xd1e8ee19f4501987468891a5505e596031610f86', // avme-elk
  '0xf2c55153b408b5030e62617861a15aa99727ff3f', // yts-elk
  '0x1a9292de525231f377b59b982fa1bbe16b83e166', // olive-elk
  '0x4280492c441c3ed592a6537bd428fecbe4bc3787', // sherpa-elk
  '0x3b7aeb242f55204dc31ce09cc31d0315caead638', // rugpull-elk
  // Round 10
  '0x9ec3ca469f415a7e55a21dc662d427d59e8de8f6', // avax-elk
  '0x482dcc1b2477d44af818d7a9b0d1f545356cb58a', // usdt.e-elk
  '0x76d80ca1fc1dd8355b692f961d198dd7a2858edb', // avai-elk
  '0x7eb3a69252b5a29d0239b45e088a4baec906a0b1', // dcau-elk
  '0x5916de85c68db865f35df760f01110f09b5be90e', // melt-elk
  '0xebf8bd7a000d02849cced5feb2079028e2fa6d23', // h2o-elk
  '0xc2c8944b0c66eca1b55dc9f9c959c1d6ac77f70e', // yak-elk
  '0xad7185fe19ef6607ab7631749373a261461adf7c', // joe-elk
  '0xa4f5447ce95fe4cdb7ecd023d6ea0274b85a27ff', // ave-elk
  '0xd3641c0ebe0361de44d0298e165943b6b0422d98', // eth.e-elk
  '0x17c2e0d60b75961729aecc69ccc7e904b9411fa3', // racex-elk
  '0x54d434c6688986b24a2d01df8e0c116744fca5f6', // snob-elk
  '0xcf025c16c9cd72eebf0513a1ed8f588f99d1bcd9', // png-elk
  '0x598acf0e3af1b81891403167e9ecd4744a1e6f9f', // vso-elk
  '0x1dd9d03da8d3fc3af45ad57d75fa99e97ca9abc6', // xava-elk
  '0xd1e8ee19f4501987468891a5505e596031610f86', // avme-elk
  '0x84ecab09c480121cf0b94726d6230901886f97ef', // qi-elk
  '0xf2c55153b408b5030e62617861a15aa99727ff3f', // yts-elk
  '0x1a9292de525231f377b59b982fa1bbe16b83e166', // olive-elk
  '0x29c06e6a797fef985290e71a819f49619153e129', // tundra-elk
  '0x4280492c441c3ed592a6537bd428fecbe4bc3787', // sherpa-elk
  '0x3b7aeb242f55204dc31ce09cc31d0315caead638', // rugpull-elk
  // Round 9
  '0x9ec3ca469f415a7e55a21dc662d427d59e8de8f6', // avax-elk
  '0x482dcc1b2477d44af818d7a9b0d1f545356cb58a', // usdt.e-elk
  '0xafdb3f79ac7de9d8e95c6e774f222959cc99e889', // dai.e-elk
  '0x76d80ca1fc1dd8355b692f961d198dd7a2858edb', // avai-elk
  '0x7eb3a69252b5a29d0239b45e088a4baec906a0b1', // dcau-elk
  '0xc2c8944b0c66eca1b55dc9f9c959c1d6ac77f70e', // yak-elk
  '0xad7185fe19ef6607ab7631749373a261461adf7c', // joe-elk
  '0xa4f5447ce95fe4cdb7ecd023d6ea0274b85a27ff', // ave-elk
  '0xd3641c0ebe0361de44d0298e165943b6b0422d98', // eth.e-elk
  '0x6609b69a3ea9f8239dce55e99ff349517525326d', // link.e-elk
  '0x54d434c6688986b24a2d01df8e0c116744fca5f6', // snob-elk
  '0x83f1237728ecafd010b1b593b947d2e44a3fac25', // plt-elk
  '0x5cc7b78432140b7a8dd955d51f3d9ba4e707b65e', // wbtc.e-elk
  '0xcf025c16c9cd72eebf0513a1ed8f588f99d1bcd9', // png-elk
  '0x598acf0e3af1b81891403167e9ecd4744a1e6f9f', // vso-elk
  '0x1dd9d03da8d3fc3af45ad57d75fa99e97ca9abc6', // xava-elk
  '0xd1e8ee19f4501987468891a5505e596031610f86', // avme-elk
  '0x84ecab09c480121cf0b94726d6230901886f97ef', // qi-elk
  '0xf2c55153b408b5030e62617861a15aa99727ff3f', // yts-elk
  '0x1a9292de525231f377b59b982fa1bbe16b83e166', // olive-elk
  '0x29c06e6a797fef985290e71a819f49619153e129', // tundra-elk
  '0x4280492c441c3ed592a6537bd428fecbe4bc3787', // sherpa-elk
  '0x3b7aeb242f55204dc31ce09cc31d0315caead638', // rugpull-elk
  // Round 8
  '0x9ec3ca469f415a7e55a21dc662d427d59e8de8f6', // avax-elk
  '0xafdb3f79ac7de9d8e95c6e774f222959cc99e889', // dai.e-elk
  '0xa4f5447ce95fe4cdb7ecd023d6ea0274b85a27ff', // ave-elk
  '0xd3641c0ebe0361de44d0298e165943b6b0422d98', // eth.e-elk
  '0x482dcc1b2477d44af818d7a9b0d1f545356cb58a', // usdt.e-elk
  '0x6609b69a3ea9f8239dce55e99ff349517525326d', // link.e-elk
  '0x5cc7b78432140b7a8dd955d51f3d9ba4e707b65e', // wbtc.e-elk
  '0xad7185fe19ef6607ab7631749373a261461adf7c', // joe-elk
  '0xc2c8944b0c66eca1b55dc9f9c959c1d6ac77f70e', // yak-elk
  '0x676f108f321585d3194b9bda29698bbae277f3cd', // sushi.e-elk
  '0x1dd9d03da8d3fc3af45ad57d75fa99e97ca9abc6', // xava-elk
  '0xb17a476e045b47185d1a28720429965da110e247', // spore-elk
  '0x54d434c6688986b24a2d01df8e0c116744fca5f6', // snob-elk
  '0xcf025c16c9cd72eebf0513a1ed8f588f99d1bcd9', // png-elk
  '0x1f03e53401ec22fbd125d61aa194741d46cc3bcf', // aave.e-elk
  '0x84ecab09c480121cf0b94726d6230901886f97ef', // qi-elk
  '0x598acf0e3af1b81891403167e9ecd4744a1e6f9f', // vso-elk
  '0xf2c55153b408b5030e62617861a15aa99727ff3f', // yts-elk
  '0xd1e8ee19f4501987468891a5505e596031610f86', // avme-elk
  '0x1a9292de525231f377b59b982fa1bbe16b83e166', // olive-elk
  '0x29c06e6a797fef985290e71a819f49619153e129', // tundra-elk
  '0x4280492c441c3ed592a6537bd428fecbe4bc3787', // sherpa-elk
  '0x3b7aeb242f55204dc31ce09cc31d0315caead638', // rugpull-elk
  '0x7eb3a69252b5a29d0239b45e088a4baec906a0b1', // dcau-elk
  // Round 7
  '0xda9cf7ca08982db05dc04e538a2d9a4ffdee6952', // avax-elk
  '0xe9e6799cd59c1cea3c4606b83f38621f150c605b', // dai.e-elk
  '0x92bfa7f1a3095de19320e2cfc52ef7787de50461', // ave-elk
  '0x9b33a551664458328c3a6e19c5168319fac6a7de', // eth.e-elk
  '0x91dac6ab6e55d3ea926af84c05c3ab123c5d7791', // usdt.e-elk
  '0x6177187e1e767cc62ed70c3d75a2d6c905994e35', // link.e-elk
  '0xa2d5783c68a5b0c492dbb02526489d17899b4f5f', // wbtc.e.-elk
  '0xab24b80b355f1f5fd1218784cc6f080463e55176', // joe-elk
  '0x08d52263c47ad6b5ae03de52269fcaa5460c4fe1', // yak-elk
  '0x35ad31f2431e6b6759bcf21f8677fab64db62de7', // sushi.e-elk
  '0x2e9c04ca74bcfc4b7f67579ed4981bb2424073fa', // xava-elk
  '0x16c430b3ef5b4db173c199b91fcfb983329bbd41', // spore-elk
  '0xb2751c27982618848eb00d87bc039574fde5c2d3', // snob-elk
  '0x84757de29c74306be2eec7738c2fa8281a8312e0', // png-elk
  '0xc28927c875dd43139d23f6c16641ab6ebd4e7943', // aave.e-elk
  '0x3291e7c26e4d140eeca633d868d77d4851a35f4e', // qi-elk
  '0x39936916b137409c5c4c546b91d54d4ae5d3786e', // vso-elk
  '0xf45c092db852534947cbdd8382f189201a0baa27', // yts-elk
  '0xe4095f4ef9f2332f23948ea10000d00d246d2a86', // avme-elk
  '0xff0b671ecd65fdcd0064c93f2975870e0a6075d8', // olive-elk
  '0xa3091f85e7bdf43bb8cb73c7130e4ca2d64a4e64', // tundra-elk
  '0x76550efe55e28887ed84393cd6d0d7848542118c', // sherpa-elk
  '0x17ded44898131526f1d980d93d69aaba2cc1dcc4', // rugpull-elk
  // Round 6
  '0xa811738e247b27ec3c82873b4273425b5355bd71', // avax-elk
  '0xeb162cac1516eadb4aaaa560b1b526b27b3d3c4c', // dai-elk
  '0x642d7d545e991e913bd03eb4e65562dca1d85246', // wbtc-elk
  '0xdb8a8c4556fbe797507b0d9a14b74541492f6b87', // eth-elk
  '0x3421d04fd330e9642a8a38236b3ffe270050ea93', // link-elk
  '0x0aaa6b13149900f39ef949ba690fd9159801167b', // usdt-elk
  '0xa18881c13ab4af4349cde10ec47537f71ecabc4e', // spore-elk
  '0xdf25d4ee0242bc83d12d93f92d67342a8725b2da', // png-elk
  '0x41537105d5702f77a0e04cfdf5519aa9739ae683', // joe-elk
  '0xf7aa6e07dee4065cefd20d2cb719638dc14df371', // ave-elk
  '0xcbbe932b465692150b030ae27427c6b69be9b061', // sushi-elk
  '0x99e7ef79f166571fb6b5f156c70525f2e7b1f0af', // aave-elk
  '0x3ab4b2738fe5712332b8a1d8bc251f9854c22053', // xava-elk
  '0x13109717a76a16df578ac5b4a06139ff255f3fbd', // vso-elk
  '0x3606b6602b429907cf6033e9c228316981970d7c', // snob-elk
  // Round 5
  '0x143fc3b2f36287339edca2b121033e2a72d0d4ef', // avax-elk
  '0xa5af747d6e1b199755834f1e8490ba1df0070e24', // usdt-elk
  '0x0d59c0092a1d7d2b348824419d5fc7d7f42d7c98', // eth-elk
  '0xa492a986a2744ca65679ed36ffd3c6be2e694246', // wbtc-elk
  '0xbfd2c7725f1f2690eb11f2bd01ec7171b9ce8e0c', // link-elk
  '0x5685697148563e21e3f896de7d1c89183dc84e9b', // dai-elk
  '0x38be387c33946fa92c800e761ea486f5a0c4ddf3', // png-elk
  '0x7c3edab3fab6f4786fe4a89c6ac8c539e0bb2aab', // yts-elk
  '0x44bdcf5bf279fef689e1e0cc4cee81e35d297833', // olive-elk
  '0x2ef4590f4f282e7c042874ff9c37d9d371963f32', // pefi-elk
  '0x685f0548b356f97fa44bda366e9cc47d82d5d989', // spore-elk
  '0x01645d7c05cbe5d8028584f0c8b6d6407b7febb2', // sushi-elk
  '0x9a4c71941d63d9060deeef1132cf76ccecb261a9', // snob-elk
  '0xa65938df082f58fa0b9a6d8c35865cb104e2e5d1', // sfi-elk
  '0x75a83ae18023ef32d97451117d9e6b202d17291f', // sl3-elk
  '0xbcf9f29b6cfee4dc2a1835c4707bc90b1d35fbe0', // arfv2-elk
  '0xb92655de8a5f6edcbdd6beeb110f385646de1768', // ave-elk
  '0xeb10facda0fe4b80839f3faf4886034387d6709b', // husky-elk
  '0xf14c5f5f2675c0d44ccef16ef6a4368061f7b79d', // xava-elk
  '0x0a471974c1093bdc7d00586baaf3e64ea675ea06', // vso-elk
  '0x3c6d9dedd2a2d2e57df988e7d7bd77eb4aa72ea0', // joe-elk
  // Round 4
  "0xc990380d5fb656010bcb8ab1e7f1041bc3155dfd", // avax-elk
  "0x4454d8df7cc99ccf1f5463ba3fffe1499a432392", // usdt-elk
  "0xb7f8fcaf0fe1f24e8f870391fd5c47c0c85acad0", // eth-elk
  "0x296d24ce3df6a1c5421d035212d30da2abf52a1e", // wbtc-elk
  "0x975cbf5e26a1dc010d9c7948ee8ec152fb7b6305", // link-elk
  "0xa68294fd8d399a47b7acb86d67355b0bc652b9f8", // dai-elk
  "0x234362079da44960fa6f8ce24fb9da5a36a096ba", // png-elk
  "0x408baefcecb217d23b225b67286ec64d01f3b365", // yts-elk
  "0xc1c3740a269ba3ed7aa2cea36f336a6042e1889f", // olive-elk
  "0x60f5e19ea1488ef514cdc7d42953ca0157caf720", // pefi-elk
  "0x30534a68450f2492d04256ac78b9b9a7a7214a5a", // spore-elk
  "0x7e1e7c5123f857a3e57e0802f3603d120f69c819", // sushi-elk
  "0x3ecc0622b9abb91ca475a6f2360698d4f56ab71d", // sfi-elk
  "0x8020138c90433d8918a95d141231a5f34ecc69ed", // sl3-elk
  "0x0c7460a12fad2f1e0e1d3ec86a3471947c16a2b6", // arfv2-elk
  "0x1ccbb416bfafa14fb06192b9f542db0c246388fe", // snob-elk
  "0xcd01b1ad51fafd09a59f66e80564642a9b025c4c", // ave-elk
  "0xc13c56e2b7e2362fec31fb431781b2f2b1010c86", // husky-elk
  // Round 3
  "0x9080bd46a55f8a32db2b609c74f8125a08dafbc3", // elk-avax
  "0x4235f9be035541a69525fa853e2369fe493ba936", // elk-usdt
  "0x777e391521a542430bdd59be48b1eac00117427c", // elk-eth
  "0x2d9c1e87595c6ed24cfec114549a955b7023e1a9", // elk-wbtc
  "0xe18ae29256ee2d31f7a4aa72567fde1ff7d9895e", // elk-link
  "0xfeeff2fcb7fe9f3211abe643c3f49f3a4f04063a", // elk-dai
  "0xc1e72bf3f97505537adad52639f3bbf2df5e5736", // elk-png
  "0x9bc04d39a721b48ca33700214961ac5cc3622f76", // elk-yts
  "0x99ef222dba70eb0a396115d3ad0633c88bc73582", // elk-olive
  "0xa8d91c6093b700897e4654a71be67fe017f10098", // elk-pefi
  "0x621b5adc58cce0f1efa0c51007ab9a923213f759", // elk-spore
  "0xb961966cae73a66e96d22965de8d253c0fcbcf04", // elk-sushi
  "0xec4676aaae8b958464d087d4faaa6731f0596ae9", // elk-sfi
  "0x325d72d3d0806fd2a45a6c44e3e51d18d8187117", // elk-sl3
  "0x0da14647cc52cd93cd5c57bb67dc45de4cd12ef1", // elk-snob
  // Round 2
  "0x3a79b48d3dcc17dd6f1f844769ab309e4b969071", // elk-avax
  "0x7c516cf7e4f4f1bd49d355a97f81f13dbfcbe0d7", // elk-usdt
  "0x5311ea28df83703fde89797a56a39e30f09a2016", // elk-eth
  "0x6ebc13418aaae79031e5cba2c46343d551454a6a", // elk-wbtc
  "0xf9381821ab0c50cbc2fd9e6d578dcaf12c547ec6", // elk-link
  "0xced63f752ab8b2a58f1c7b8ef5438b263efd990a", // elk-dai
  "0x69572262bd8efe1f1c58955aeaff4ce720e67b1b", // elk-png
  "0xb79604244adc72e566eed6769ea3f3070c13fa66", // elk-yts
  "0xf48178449edc09f59e3b04261d51a3bf43aed71e", // elk-olive
  "0x78ec4648d2463bc792f0fe0131fa40c9381ca0cb", // elk-pefi
  "0xa99469e429716a38bf1d858df3fb2a8f4a229e4c", // elk-spore
  "0x9f2dc6aa55ec08aadd73b3a6331f081a20a5f212", // elk-sushi
  // Round 1
  "0xaa8a33e7bcadb52ab4f43152682e483607fac83f", // avax-elk
  "0x0f503ff3eec91a882513c4ec0cced8ce543f6bcf", // elk-usdt
  "0xa8eb0fdfa77185c20beb05f40863226cd74b3d5b", // elk-eth
  "0x2cb6c0710a5b9ee30ff41358dacc7bd7bbd8681f", // elk-wbtc
  "0x819bbc76fd65a385a7b727723df5e636fc3e877f", // elk-link
  "0x5b26b28276616a247ee61b9bb1b09e99a4576764", // elk-dai
  "0x8b763519d3e634533b4039491e09f5774281e4b4", // elk-png
  "0x25d8f5acdfc4086865c57d0b4567e47b9f9db0b9", // elk-sfi
  "0x86b2188aca3abce88ecb27cf6814790cb58587f3", // elk-yts
  "0xa44bd7601f79c5d1c51fa3a89536d7be594ad008", // elk-olive
  "0x7f16dff067931ee174021d744494327ef4780524", // elk-pefi
  "0x2f9cac73265bc89257aeb33ae0ed273ebdfb755f", // avax-usdt
  "0x599d0d43af7f84e245bf68b9e4517f3f8e43d900", // avax-eth
  "0x97fb1a0d7cfe3bef6c2edbe1fcefd41a91318407", // avax-wbtc
  "0xbb573d20d73296ec2c8051bec2c5c8d85ce46d22", // avax-link
  "0x3da423405d2eb675b9046fe7c18b843b20ffadd3", // avax-dai
]

function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId).sender !== null // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  // ignore initial transfers for first adds
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
    return
  }

  // skip if staking/unstaking
  if (MINING_POOLS.indexOf(event.params.from.toHexString()) !== -1 || MINING_POOLS.indexOf(event.params.to.toHexString()) !== -1) {
    return
  }

  let factory = ElkFactory.load(FACTORY_ADDRESS)
  let transactionHash = event.transaction.hash.toHexString()

  // user stats
  let from = event.params.from
  createUser(from)
  let to = event.params.to
  createUser(to)

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString())
  let pairContract = PairContract.bind(event.address)

  // liquidity token amount being transfered
  let value = convertTokenToDecimal(event.params.value, BI_18)

  // get or create transaction
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
  }

  // mints
  let mints = transaction.mints
  if (from.toHexString() == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value)
    pair.save()

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        event.transaction.hash
          .toHexString()
          .concat('-')
          .concat(BigInt.fromI32(mints.length).toString())
      )
      mint.transaction = transaction.id
      mint.pair = pair.id
      mint.to = to
      mint.liquidity = value
      mint.timestamp = transaction.timestamp
      mint.transaction = transaction.id
      mint.save()

      // update mints in transaction
      transaction.mints = mints.concat([mint.id])

      // save entities
      transaction.save()
      factory.save()
    }
  }

  // case where direct send first on ETH withdrawls
  if (event.params.to.toHexString() == pair.id) {
    let burns = transaction.burns
    let burn = new BurnEvent(
      event.transaction.hash
        .toHexString()
        .concat('-')
        .concat(BigInt.fromI32(burns.length).toString())
    )
    burn.transaction = transaction.id
    burn.pair = pair.id
    burn.liquidity = value
    burn.timestamp = transaction.timestamp
    burn.to = event.params.to
    burn.sender = event.params.from
    burn.needsComplete = true
    burn.transaction = transaction.id
    burn.save()

    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    burns.push(burn.id)
    transaction.burns = burns
    transaction.save()
  }

  // burn
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.from.toHexString() == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value)
    pair.save()

    // this is a new instance of a logical burn
    let burns = transaction.burns
    let burn: BurnEvent
    if (burns.length > 0) {
      let currentBurn = BurnEvent.load(burns[burns.length - 1])
      if (currentBurn.needsComplete) {
        burn = currentBurn as BurnEvent
      } else {
        burn = new BurnEvent(
          event.transaction.hash
            .toHexString()
            .concat('-')
            .concat(BigInt.fromI32(burns.length).toString())
        )
        burn.transaction = transaction.id
        burn.needsComplete = false
        burn.pair = pair.id
        burn.liquidity = value
        burn.transaction = transaction.id
        burn.timestamp = transaction.timestamp
      }
    } else {
      burn = new BurnEvent(
        event.transaction.hash
          .toHexString()
          .concat('-')
          .concat(BigInt.fromI32(burns.length).toString())
      )
      burn.transaction = transaction.id
      burn.needsComplete = false
      burn.pair = pair.id
      burn.liquidity = value
      burn.transaction = transaction.id
      burn.timestamp = transaction.timestamp
    }

    // if this logical burn included a fee mint, account for this
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1])
      burn.feeTo = mint.to
      burn.feeLiquidity = mint.liquidity
      // remove the logical mint
      store.remove('Mint', mints[mints.length - 1])
      // update the transaction

      // TODO: Consider using .slice().pop() to protect against unintended
      // side effects for other code paths.
      mints.pop()
      transaction.mints = mints
      transaction.save()
    }
    burn.save()
    // if accessing last one, replace it
    if (burn.needsComplete) {
      // TODO: Consider using .slice(0, -1).concat() to protect against
      // unintended side effects for other code paths.
      burns[burns.length - 1] = burn.id
    }
    // else add new one
    else {
      // TODO: Consider using .concat() for handling array updates to protect
      // against unintended side effects for other code paths.
      burns.push(burn.id)
    }
    transaction.burns = burns
    transaction.save()
  }

  if (from.toHexString() != ADDRESS_ZERO && from.toHexString() != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(event.address, from)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertTokenToDecimal(event.params.value, BI_18))
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)
  }

  if (event.params.to.toHexString() != ADDRESS_ZERO && to.toHexString() != pair.id) {
    let toUserLiquidityPosition = createLiquidityPosition(event.address, to)
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(convertTokenToDecimal(event.params.value, BI_18))
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }

  transaction.save()
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHex())
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let elk = ElkFactory.load(FACTORY_ADDRESS)

  // reset factory liquidity by subtracting only tracked liquidity
  elk.totalLiquidityETH = elk.totalLiquidityETH.minus(pair.trackedReserveETH as BigDecimal)

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1)

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

  if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = ZERO_BD
  if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = ZERO_BD

  pair.save()

  // update ETH price now that reserves could have changed
  let bundle = Bundle.load('1')
  bundle.ethPrice = getEthPriceInUSD()
  bundle.save()

  token0.derivedETH = findEthPerToken(token0 as Token)
  token1.derivedETH = findEthPerToken(token1 as Token)
  token0.save()
  token1.save()

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityETH: BigDecimal
  if (bundle.ethPrice.notEqual(ZERO_BD)) {
    trackedLiquidityETH = getTrackedLiquidityUSD(pair.reserve0, token0 as Token, pair.reserve1, token1 as Token).div(
      bundle.ethPrice
    )
  } else {
    trackedLiquidityETH = ZERO_BD
  }

  // use derived amounts within pair
  pair.trackedReserveETH = trackedLiquidityETH
  pair.reserveETH = pair.reserve0
    .times(token0.derivedETH as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedETH as BigDecimal))
  pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice)

  // use tracked amounts globally
  elk.totalLiquidityETH = elk.totalLiquidityETH.plus(trackedLiquidityETH)
  elk.totalLiquidityUSD = elk.totalLiquidityETH.times(bundle.ethPrice)

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1)

  // save entities
  pair.save()
  elk.save()
  token0.save()
  token1.save()
}

export function handleMint(event: Mint): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  let mints = transaction.mints
  let mint = MintEvent.load(mints[mints.length - 1])

  let pair = Pair.load(event.address.toHex())
  let elk = ElkFactory.load(FACTORY_ADDRESS)

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)

  // update exchange info (except balances, sync will cover that)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice)

  // update txn counts
  pair.txCount = pair.txCount.plus(ONE_BI)
  elk.txCount = elk.txCount.plus(ONE_BI)

  // save entities
  token0.save()
  token1.save()
  pair.save()
  elk.save()

  mint.sender = event.params.sender
  mint.amount0 = token0Amount as BigDecimal
  mint.amount1 = token1Amount as BigDecimal
  mint.logIndex = event.logIndex
  mint.amountUSD = amountTotalUSD as BigDecimal
  mint.save()

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, mint.to as Address)
  createLiquiditySnapshot(liquidityPosition, event)

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updateElkDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleBurn(event: Burn): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())

  // safety check
  if (transaction === null) {
    return
  }

  let burns = transaction.burns
  let burn = BurnEvent.load(burns[burns.length - 1])

  let pair = Pair.load(event.address.toHex())
  let elk = ElkFactory.load(FACTORY_ADDRESS)

  //update token info
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice)

  // update txn counts
  elk.txCount = elk.txCount.plus(ONE_BI)
  pair.txCount = pair.txCount.plus(ONE_BI)

  // update global counter and save
  token0.save()
  token1.save()
  pair.save()
  elk.save()

  // update burn
  // burn.sender = event.params.sender
  burn.amount0 = token0Amount as BigDecimal
  burn.amount1 = token1Amount as BigDecimal
  // burn.to = event.params.to
  burn.logIndex = event.logIndex
  burn.amountUSD = amountTotalUSD as BigDecimal
  burn.save()

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, burn.sender as Address)
  createLiquiditySnapshot(liquidityPosition, event)

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updateElkDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleSwap(event: Swap): void {
  // check if sender and dest are equal to the router
  // if so, change the to address to the tx issuer
  let dest: Address
  if (event.params.sender == Address.fromString(ROUTER_ADDRESS) && event.params.to == Address.fromString(ROUTER_ADDRESS)) {
    dest = event.transaction.from
  } else {
    dest = event.params.to
  }

  let pair = Pair.load(event.address.toHexString())
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

  // totals for volume updates
  let amount0Total = amount0Out.plus(amount0In)
  let amount1Total = amount1Out.plus(amount1In)

  // ETH/USD prices
  let bundle = Bundle.load('1')

  // get total amounts of derived USD and ETH for tracking
  let derivedAmountETH = token1.derivedETH
    .times(amount1Total)
    .plus(token0.derivedETH.times(amount0Total))
    .div(BigDecimal.fromString('2'))
  let derivedAmountUSD = derivedAmountETH.times(bundle.ethPrice)

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  let trackedAmountETH: BigDecimal
  if (bundle.ethPrice.equals(ZERO_BD)) {
    trackedAmountETH = ZERO_BD
  } else {
    trackedAmountETH = trackedAmountUSD.div(bundle.ethPrice)
  }

  // update token0 global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD)
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD)
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD)
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD)
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // update global values, only used tracked amounts for volume
  let elk = ElkFactory.load(FACTORY_ADDRESS)
  elk.totalVolumeUSD = elk.totalVolumeUSD.plus(trackedAmountUSD)
  elk.totalVolumeETH = elk.totalVolumeETH.plus(trackedAmountETH)
  elk.untrackedVolumeUSD = elk.untrackedVolumeUSD.plus(derivedAmountUSD)
  elk.txCount = elk.txCount.plus(ONE_BI)

  // save entities
  pair.save()
  token0.save()
  token1.save()
  elk.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.swaps = []
    transaction.burns = []
  }
  let swaps = transaction.swaps
  let swap = new SwapEvent(
    event.transaction.hash
      .toHexString()
      .concat('-')
      .concat(BigInt.fromI32(swaps.length).toString())
  )

  // update swap event
  swap.transaction = transaction.id
  swap.pair = pair.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
  swap.sender = event.params.sender
  swap.amount0In = amount0In
  swap.amount1In = amount1In
  swap.amount0Out = amount0Out
  swap.amount1Out = amount1Out
  swap.to = dest
  swap.from = event.transaction.from
  swap.logIndex = event.logIndex
  // use the tracked amount if we have it
  swap.amountUSD = trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD
  swap.save()

  // update the transaction

  // TODO: Consider using .concat() for handling array updates to protect
  // against unintended side effects for other code paths.
  swaps.push(swap.id)
  transaction.swaps = swaps
  transaction.save()

  // update day entities
  let pairDayData = updatePairDayData(event)
  let pairHourData = updatePairHourData(event)
  let elkDayData = updateElkDayData(event)
  let token0DayData = updateTokenDayData(token0 as Token, event)
  let token1DayData = updateTokenDayData(token1 as Token, event)

  // swap specific updating
  elkDayData.dailyVolumeUSD = elkDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  elkDayData.dailyVolumeETH = elkDayData.dailyVolumeETH.plus(trackedAmountETH)
  elkDayData.dailyVolumeUntracked = elkDayData.dailyVolumeUntracked.plus(derivedAmountUSD)
  elkDayData.save()

  // swap specific updating for pair
  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total)
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total)
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  pairDayData.save()

  // update hourly pair data
  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total)
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total)
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(trackedAmountUSD)
  pairHourData.save()

  // swap specific updating for token0
  token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(amount0Total)
  token0DayData.dailyVolumeETH = token0DayData.dailyVolumeETH.plus(amount0Total.times(token0.derivedETH as BigDecimal))
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
    amount0Total.times(token0.derivedETH as BigDecimal).times(bundle.ethPrice)
  )
  token0DayData.save()

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total)
  token1DayData.dailyVolumeETH = token1DayData.dailyVolumeETH.plus(amount1Total.times(token1.derivedETH as BigDecimal))
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
    amount1Total.times(token1.derivedETH as BigDecimal).times(bundle.ethPrice)
  )
  token1DayData.save()
}
