import PromiseQueue from 'https://cdn.skypack.dev/p-queue';

let moveSnarkQueue;
if (window.moveSnarkQueue === undefined) {
  moveSnarkQueue = new PromiseQueue({ concurrency: 1 });
  moveSnarkQueue.on('add', () => {
    console.log('Adding to task to the MoveSnark Queue. Size:', moveSnarkQueue.size);
  });
  moveSnarkQueue.on('next', () => {
    console.log('Processed task from MoveSnark Queue. Remaining size:', moveSnarkQueue.size);
  });
  window.moveSnarkQueue = moveSnarkQueue;
} else {
  moveSnarkQueue = window.moveSnarkQueue;
}

let contractQueue;
if (window.contractQueue === undefined) {
  let contractQueue = new PromiseQueue({ concurrency: 1 });
  contractQueue.on('add', () => {
    console.log('Adding to task to the Contract Queue. Size:', contractQueue.size);
  });
  contractQueue.on('next', () => {
    console.log('Processed task from Contract Queue. Remaining size:', contractQueue.size);
  });
  window.contractQueue = contractQueue;
} else {
  contractQueue = window.contractQueue;
}

// Taken from game logic but removed Terminal and Notifications
function onTxConfirmed(unminedTx, success) {
  if (success) {
    df.contractsAPI.emit('TxConfirmed', unminedTx);
  } else {
    df.contractsAPI.emit('TxReverted', unminedTx);
  }
}

// Taken from game logic but removed Terminal and Notifications
function onTxSubmit(unminedTx) {
  df.contractsAPI.emit('TxSubmitted', unminedTx);
}

// Taken from game logic
function getRandomActionId() {
  const hex = '0123456789abcdef';

  let ret = '';
  for (let i = 0; i < 10; i += 1) {
    ret += hex[Math.floor(hex.length * Math.random())];
  }
  return ret;
};

// Taken from game
let ZKArgIdx = {
  PROOF_A: 0,
  PROOF_B: 1,
  PROOF_C: 2,
  DATA: 3,
};
let MoveArgIdxs = {
  FROM_ID: 0,
  TO_ID: 1,
  TO_PERLIN: 2,
  TO_RADIUS: 3,
  DIST_MAX: 4,
  SHIPS_SENT: 5,
  SILVER_SENT: 6,
}
let contractPrecision = 1000;
let CheckedTypeUtils = df.getCheckedTypeUtils();

// Kinda ContractsAPI.move() but without `waitFor` logic
async function send(actionId, snarkArgs) {
  let txIntent = df.entityStore.unconfirmedMoves[actionId];

  try {
    const args = [
      snarkArgs[ZKArgIdx.PROOF_A],
      snarkArgs[ZKArgIdx.PROOF_B],
      snarkArgs[ZKArgIdx.PROOF_C],
      [
        ...snarkArgs[ZKArgIdx.DATA],
        (txIntent.forces * contractPrecision).toString(),
        (txIntent.silver * contractPrecision).toString(),
      ],
    ];

    const tx = df.contractsAPI.txRequestExecutor.makeRequest(
      'MOVE',
      actionId,
      df.contractsAPI.coreContract,
      args,
      {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      },
      undefined // no snark logs
    );

    const forcesFloat = parseFloat(args[ZKArgIdx.DATA][MoveArgIdxs.SHIPS_SENT]);
    const silverFloat = parseFloat(
      args[ZKArgIdx.DATA][MoveArgIdxs.SILVER_SENT]
    );

    const unminedMoveTx = {
      actionId,
      type: 'MOVE',
      txHash: (await tx.submitted).hash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
      from: CheckedTypeUtils.locationIdFromDecStr(
        args[ZKArgIdx.DATA][MoveArgIdxs.FROM_ID]
      ),
      to: CheckedTypeUtils.locationIdFromDecStr(
        args[ZKArgIdx.DATA][MoveArgIdxs.TO_ID]
      ),
      forces: forcesFloat / contractPrecision,
      silver: silverFloat / contractPrecision,
    };

    onTxSubmit(unminedMoveTx);

    try {
      let receipt = await tx.confirmed;
      onTxConfirmed(unminedMoveTx, receipt.status === 1);
    } catch (err) {
      console.log(err);
      onTxConfirmed(unminedMoveTx, false);
    }
  } catch (err) {
    console.log(err);
    df.onTxIntentFail(txIntent, err);
  }
}

// Split from GameManager.move() to using our queue
async function snark(actionId, oldX, oldY, newX, newY) {
  let txIntent = df.entityStore.unconfirmedMoves[actionId];

  const xDiff = newX - oldX;
  const yDiff = newY - oldY;

  const distMax = Math.ceil(Math.sqrt(xDiff ** 2 + yDiff ** 2));

  try {
    let [callArgs] = await df.snarkHelper.getMoveArgs(
      oldX,
      oldY,
      newX,
      newY,
      df.worldRadius,
      distMax
    );

    contractQueue.add(() => send(actionId, callArgs))
  } catch (err) {
    console.log(err);
    df.onTxIntentFail(txIntent, err);
  }
}

// Kinda like GameManager.move() but without localstorage and using our queue
export function move(from, to, forces, silver) {
  const oldLocation = df.entityStore.getLocationOfPlanet(from);
  const newLocation = df.entityStore.getLocationOfPlanet(to);
  if (!oldLocation) {
    console.error('tried to move from planet that does not exist');
    return;
  }
  if (!newLocation) {
    console.error('tried to move from planet that does not exist');
    return;
  }

  const oldX = oldLocation.coords.x;
  const oldY = oldLocation.coords.y;
  const newX = newLocation.coords.x;
  const newY = newLocation.coords.y;

  const shipsMoved = forces;
  const silverMoved = silver;

  if (newX ** 2 + newY ** 2 >= df.worldRadius ** 2) {
    throw new Error('attempted to move out of bounds');
  }

  const oldPlanet = df.entityStore.getPlanetWithLocation(oldLocation);

  if (!df.account || !oldPlanet || oldPlanet.owner !== df.account) {
    throw new Error('attempted to move from a planet not owned by player');
  }
  const actionId = getRandomActionId();

  const txIntent = {
    actionId,
    type: 'MOVE',
    from: oldLocation.hash,
    to: newLocation.hash,
    forces: shipsMoved,
    silver: silverMoved,
  };

  df.handleTxIntent(txIntent);

  moveSnarkQueue.add(() => snark(actionId, oldX, oldY, newX, newY));
}
