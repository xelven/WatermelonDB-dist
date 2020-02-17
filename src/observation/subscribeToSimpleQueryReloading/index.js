// @flow

import { invariant, logError } from '../../utils/common'
import { type Unsubscribe } from '../../utils/subscriptions'

import type { CollectionChangeSet } from '../../Collection'
import { CollectionChangeTypes } from '../../Collection/common'

import type Query from '../../Query'
import type Model from '../../Model'

import encodeMatcher, { type Matcher } from '../encodeMatcher'

// WARN: Mutates arguments
export function processChangeSet<Record: Model>(
  changeSet: CollectionChangeSet<Record>,
  matcher: Matcher<Record>,
  mutableMatchingRecords: Record[],
): boolean {
  let shouldEmit = false
  changeSet.forEach(change => {
    const { record, type } = change
    const index = mutableMatchingRecords.indexOf(record)
    const currentlyMatching = index > -1

    if (type === CollectionChangeTypes.destroyed) {
      if (currentlyMatching) {
        // Remove if record was deleted
        mutableMatchingRecords.splice(index, 1)
        shouldEmit = true
      }
      return
    }

    const matches = matcher(record._raw)

    if (currentlyMatching && !matches) {
      // Remove if doesn't match anymore
      mutableMatchingRecords.splice(index, 1)
      shouldEmit = true
    } else if (matches && !currentlyMatching) {
      // Add if should be included but isn't
      mutableMatchingRecords.push(record)
      shouldEmit = true
    }
  })
  return shouldEmit
}

export default function subscribeToSimpleQueryReloading<Record: Model>(
  query: Query<Record>,
  subscriber: (Record[]) => void,
): Unsubscribe {
  invariant(!query.hasJoins, 'subscribeToSimpleQueryReloading only supports simple queries!')

  const matcher: Matcher<Record> = encodeMatcher(query.description)
  let unsubscribed = false
  let unsubscribe = null

  function reloadingObserverFetch(): void {
    query.collection._fetchQuery(query, function observeQueryInitialEmission(result): void {
      if (unsubscribed) {
        return
      }

      if (result.error) {
        logError(result.error.toString())
        return
      }

      const initialRecords = result.value

      // Send initial matching records
      const matchingRecords: Record[] = initialRecords
      const emitCopy = () => !unsubscribed && subscriber(matchingRecords.slice(0))
      emitCopy()

      // Check if emitCopy haven't completed source observable to avoid memory leaks
      if (unsubscribed) {
        return
      }
    })
  }

  // Observe changes to the collection
  unsubscribe = query.collection.experimentalSubscribe(function observeQueryCollectionChanged(
    changeSet,
  ): void {
    const { record, type } = change
    const index = mutableMatchingRecords.indexOf(record)
    const currentlyMatching = index > -1

    const matches = matcher(record._raw)

    const shouldEmit =
      (shouldEmitStatus || !previousRecords || !identicalArrays(records, previousRecords))

    if (shouldEmit) {
      emitCopy()
    }
  })

  return () => {
    unsubscribed = true
    unsubscribe && unsubscribe()
  }
}
